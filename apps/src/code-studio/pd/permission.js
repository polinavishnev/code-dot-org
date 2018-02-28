export default class Permission {
  constructor() {
    if (!window.dashboard) {
      window.dashboard = {};
    }

    if (!window.dashboard.workshop) {
      window.dashboard.workshop = {};
    }

    if (!window.dashboard.workshop.permission) {
      window.dashboard.workshop.permission = [];
    }

    this.isWorkshopAdmin = this.hasPermission('workshop_admin');
    this.isFacilitator = this.hasPermission('facilitator');
    // CSF Facilitators can create workshops, other facilitators cannot
    this.isCsfFacilitator = this.hasPermission('csf_facilitator');
    this.isOrganizer = this.hasPermission('workshop_organizer');
    this.isProgramManager = this.hasPermission('program_manager');
    this.isPartner = this.hasPermission('partner');
  }

  hasPermission(name) {
    return window.dashboard.workshop.permission.indexOf(name) >= 0;
  }

  setPermission(permission) {
    window.dashboard.workshop.permission = permission;
  }
}
