// Layout Component
// Sidebar and main content

export default function Layout({ children }) {
  return (
    <div className="flex">
      <aside className="w-64 bg-gray-800 text-white p-4">
        <nav>
          <ul>
            <li><a href="/dashboard">Dashboard</a></li>
            <li><a href="/leads">Leads</a></li>
            <li><a href="/crm">CRM</a></li>
            <li><a href="/admin">Admin</a></li>
          </ul>
        </nav>
      </aside>
      <main className="flex-1 p-4">
        {children}
      </main>
    </div>
  );
}