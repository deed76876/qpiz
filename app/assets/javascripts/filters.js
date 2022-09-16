$(() => {
  $('.js-filter-select').each((_, el) => {
    const $select = $(el);
    const $form = $select.closest('form');
    const $formFilters = $form.find('.form--filter');
    const $saveButton = $form.find('.filter-save');
    const $deleteButton = $form.find('.filter-delete');

    // Enables/Disables Save & Delete buttons programatically
    async function computeEnables() {
      const filters = await QPixel.filters();
      const filterName = $select.val();

      // Nothing set
      if (!filterName) {
        $saveButton.prop('disabled', true);
        $deleteButton.prop('disabled', true);
        return;
      }

      const filter = filters[filterName]

      // New filter
      if (!filter) {
        $saveButton.prop('disabled', false);
        $deleteButton.prop('disabled', true);
        return;
      }

      // Not a new filter
      $deleteButton.prop('disabled', filter.system);

      const hasChanges = [...$formFilters].some(el => {
        const filterValue = filter[el.dataset.name];
        let elValue = $(el).val();
        console.log(filterValue, elValue)
        if (filterValue?.constructor == Array) {
          elValue = elValue ?? [];
          return filterValue.length != elValue.length || filterValue.some((v, i) => v[1] != elValue[i]);
        }
        else {
          return filterValue ? filterValue != elValue : elValue;
        }
      });
      $saveButton.prop('disabled', filter.system || !hasChanges);
    }

    async function initializeSelect() {
      const filters = await QPixel.filters();

      function template(option) {
        if (option.id == '') { return 'None'; }

        const filter = filters[option.id];
        const name = `<span>${option.text}</span>`;
        const systemIndicator = filter?.system
          ? ' <span has-font-size-caption">(System)</span>'
          : '';
        const newIndicator = !filter
          ? ' <span has-font-size-caption">(New)</span>'
          : '';
        return $(name + systemIndicator + newIndicator);
      }

      // Clear out any old options
      $select.children().filter((_, option) => !filters[option.value]).detach();
      $select.select2({
        data: Object.keys(filters),
        tags: true,

        templateResult: template,
        templateSelection: template
      }).on('select2:select', evt => {
        const filterName = evt.params.data.id;
        const preset = filters[filterName];

        computeEnables();

        // Name is not one of the presets, i.e user is creating a new preset
        if (!preset) {
          return;
        }

        for (const [name, value] of Object.entries(preset)) {
          const $el = $form.find(`.form--filter[data-name=${name}]`);
          if (value?.constructor == Array) {
            $el.val(null);
            for (const val of value) {
              $el.append(new Option(val[0], val[1], false, true));
            }
            $el.trigger('change');
          } else {
            $el.val(value).trigger('change');
          }
        }
      });
      computeEnables();
    }

    initializeSelect();

    // Enable saving when the filter is changed
    $formFilters.on('change', computeEnables);

    $saveButton.on('click', async evt => {
      if (!$form[0].reportValidity()) { return; }

      const filter = {};

      for (const el of $formFilters) {
        filter[el.dataset.name] = $(el).val();
      }

      await QPixel.setFilter($select.val(), filter);
      // Reinitialize to get new options
      await initializeSelect();
    });

    $deleteButton?.on('click', async evt => {
      if (confirm(`Are you sure you want to delete ${$select.val()}?`)) {
        await QPixel.deleteFilter($select.val());
        // Reinitialize to get new options
        await initializeSelect();
      }
    });

    $form.find('.filter-clear').on('click', _ => {
      $select.val(null).trigger('change');
      $form.find('.form--filter').val(null).trigger('change');
      computeEnables();
    });
  });
});