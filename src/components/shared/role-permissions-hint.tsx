import { ROLE_PERMISSIONS, type RoleKey } from "@/lib/role-help";

/** تلميح صلاحيات الدور بجانب اختيار الدور في لوحة الحسابات */
export function RolePermissionsHint({ role }: { role: RoleKey }) {
  const info = ROLE_PERMISSIONS[role];
  return (
    <div className="rounded-lg border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
      <p className="font-medium text-foreground">{info.label}</p>
      <ul className="mt-1.5 list-inside list-disc space-y-0.5">
        {info.can.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {info.cannot.length > 0 ? (
        <>
          <p className="mt-2 font-medium text-foreground">لا يصل إلى</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            {info.cannot.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
