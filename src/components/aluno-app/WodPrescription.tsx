type WodPrescriptionProps = {
  name: string;
  format?: string | null;
  prescription?: string | null;
  compact?: boolean;
};

function prescriptionLines(prescription?: string | null) {
  return (prescription ?? "")
    .replace(/\\n/g, "\n")
    .split("\n")
    .map((line) => line.trim().replace(/^[•*-]\s*/, ""))
    .filter(Boolean);
}

export function WodPrescription({ name, format, prescription, compact = false }: WodPrescriptionProps) {
  const lines = prescriptionLines(prescription);
  const normalizedFormat = format?.replace(/:$/, "").trim();
  const movements = lines.filter((line) => line.replace(/:$/, "").trim().toUpperCase() !== normalizedFormat?.toUpperCase());

  return (
    <div>
      <h3 className={`${compact ? "text-[20px]" : "text-[19px]"} font-black leading-tight text-foreground`}>{name}</h3>
      {normalizedFormat && (
        <p className={`${compact ? "mt-3 text-[14px]" : "mt-4 text-[15px]"} font-black uppercase text-foreground`}>
          {normalizedFormat}
        </p>
      )}
      {movements.length > 0 && (
        <div className={`${compact ? "mt-3 space-y-2" : "mt-5 space-y-3"}`}>
          {movements.map((movement, index) => (
            <p key={`${movement}-${index}`} className="text-[14px] font-medium leading-relaxed text-foreground">
              {movement}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}