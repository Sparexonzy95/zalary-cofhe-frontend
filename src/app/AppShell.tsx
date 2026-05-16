import { Link, NavLink, Outlet } from "react-router-dom";
import { WalletConnectButton } from "../components/WalletConnectButton";

export function AppShell() {
  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand">
          <img
            src="https://res.cloudinary.com/dxmdwvmxl/image/upload/v1776941645/logo_zalary2_mm8mlp.png"
            alt="Zalary"
            style={{ height: "28px", width: "auto", objectFit: "contain" }}
          />
          <div className="brand-sub" style={{ alignSelf: "center" }}>Confidential Payroll</div>
        </Link>

        <nav className="nav">
          <NavLink to="/verify/employer" className="navlink">
            Employer
          </NavLink>
          <NavLink to="/verify/employee" className="navlink">
            Employee
          </NavLink>
          <NavLink to="/account" className="navlink">
            Account
          </NavLink>
        </nav>

        <div className="topbar-right">
          <div className="badge">Base Sepolia</div>
          <WalletConnectButton />
        </div>
      </header>

      <main className="container">
        <Outlet />
      </main>
    </div>
  );
}
