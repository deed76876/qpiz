class PinnedLinksController < ApplicationController
  before_action :verify_moderator
  before_action :set_pinned_link, only: [:edit, :update]

  def index
    links = if current_user.is_global_moderator && params[:global] == '2'
              PinnedLink.unscoped
            elsif current_user.is_global_moderator && params[:global] == '1'
              PinnedLink.where(community: nil)
            else
              PinnedLink.where(community: @community)
            end
    @links = if params[:filter] == 'all'
               links.all
             elsif params[:filter] == 'inactive'
               links.where(active: false).all
             else
               links.where(active: true).all
             end
    render layout: 'without_sidebar'
  end

  def new
    @link = PinnedLink.new
  end

  def create
    @link = PinnedLink.create pinned_link_params

    attr = @link.attributes_print
    AuditLog.moderator_audit(event_type: 'pinned_link_create', related: @link, user: current_user,
                             comment: "<<PinnedLink #{attr}>>")

    flash[:success] = 'Your pinned link has been created. Due to caching, it may take some time until it is shown.'
    redirect_to pinned_links_path
  end

  def edit
    unless current_user.is_global_moderator
      return not_found if @link.community_id != RequestContext.community_id
    end
  end

  def update
    unless current_user.is_global_moderator
      return not_found if @link.community_id != RequestContext.community_id
    end

    before = @link.attributes_print
    @link.update pinned_link_params
    after = @link.attributes_print
    AuditLog.moderator_audit(event_type: 'pinned_link_update', related: @link, user: current_user,
                             comment: "from <<PinnedLink #{before}>>\nto <<PinnedLink #{after}>>")

    flash[:success] = 'The pinned link has been updated. Due to caching, it may take some time until it is shown.'
    redirect_to pinned_links_path
  end

  private

  def set_pinned_link
    @link = PinnedLink.find params[:id]
  end

  def pinned_link_params
    if current_user.is_global_moderator
      params.require(:pinned_link).permit(:label, :link, :post_id, :active, :shown_before, :shown_after, :community_id)
    else
      params.require(:pinned_link).permit(:label, :link, :post_id, :active, :shown_before, :shown_after)
            .merge(community_id: RequestContext.community_id)
    end
  end
end
