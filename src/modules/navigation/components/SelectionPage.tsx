interface SelectionPageProps {
  onSelect: (moduleKey: string) => void;
}

const MODULES = [
  { key: "new-item", label: "New Asset", tone: "primary" },
  { key: "it-accountability-form", label: "IT Accountability Form", tone: "primary" },
  { key: "it-asset-inventory", label: "IT Asset Inventory", tone: "cta" },
  { key: "it-software-inventory", label: "IT Software Inventory", tone: "special" },
  { key: "license-maintenance", label: "License Maintenance", tone: "cta" },
  { key: "ipad-inventory", label: "IPAD Inventory", tone: "secondary" },
  { key: "disposal", label: "Disposal", tone: "alert" },
  { key: "returned-assets", label: "Returned Assets", tone: "success" }
];

export const SelectionPage = ({ onSelect }: SelectionPageProps) => {
  return (
    <section className="selection-screen" aria-label="Module Selection Page">
      <div className="selection-shell">
        <aside className="selection-sidebar" aria-label="Module chooser sidebar">
          <p className="selection-kicker">MDC IT</p>
          <h1>IT Assets Management Portal</h1>

          <div className="selection-grid">
            {MODULES.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`selection-btn selection-btn--${item.tone}`}
                onClick={() => onSelect(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </aside>

        <div className="selection-visual" role="presentation" aria-hidden="true" />
      </div>
    </section>
  );
};
