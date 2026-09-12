import { useLayoutEffect } from "react";
import { Route, Switch, useLocation } from "wouter";

import LabReports from "@/pages/LabReports";
import NotFound from "@/pages/NotFound";
import Verify from "@/pages/Verify";

import AdminCodes from "@/pages/admin/AdminCodes";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminLabReports from "@/pages/admin/AdminLabReports";
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminLogs from "@/pages/admin/AdminLogs";
import AdminProducts from "@/pages/admin/AdminProducts";
import AdminUsers from "@/pages/admin/AdminUsers";

/**
 * Browsers default scrollRestoration to "auto" and restore the previous offset
 * after React has mounted, which overwrites anything an effect does on the way
 * in. Switching it to manual and re-asserting the top on route change keeps a
 * result page from opening halfway down.
 */
function ScrollToTop() {
  const [location] = useLocation();

  useLayoutEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Switch>
        {/* Public */}
        <Route path="/" component={Verify} />
        <Route path="/verify" component={Verify} />
        <Route path="/lab-reports" component={LabReports} />

        {/* Admin */}
        <Route path="/admin/login" component={AdminLogin} />
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/codes" component={AdminCodes} />
        <Route path="/admin/products" component={AdminProducts} />
        <Route path="/admin/lab-reports" component={AdminLabReports} />
        <Route path="/admin/logs" component={AdminLogs} />
        <Route path="/admin/users" component={AdminUsers} />

        <Route component={NotFound} />
      </Switch>
    </>
  );
}
