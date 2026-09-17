export function dashboardPathForRole(role: string) {
  if (role === "CARRIER" || role === "DRIVER") {
    if (role === "DRIVER") {
      return "/driver/profile";
    }

    return "/carrier/dashboard";
  }

  if (role === "CARGO_OWNER") {
    return "/cargo-owner/dashboard";
  }

  if (role === "DISPATCHER") {
    return "/dispatcher/profile";
  }

  if (role === "OPERATOR") {
    return "/operator/dashboard";
  }

  // Express octo-admin UI (session bridged from Next JWT)
  return "/octo-admin";
}
