import { AdminHeader, Card } from "./AdminShell";

/** A section that isn't connected to the database yet, so it shows no sample data. */
export function ComingNext({ title, what }: { title: string; what: string }) {
  return (
    <div>
      <AdminHeader title={title} />
      <Card className="mt-6">
        <p className="text-ink">{what}</p>
        <p className="mt-2 text-sm text-ink-soft">This section is being connected to the live shop and will appear in the menu when it&rsquo;s ready.</p>
      </Card>
    </div>
  );
}
