import { useRef, useEffect, useState } from "react";

interface SignaturePadProps {
  onSave: (signatureDataUrl: string) => void;
  existingSignature?: string | null;
  label: string;
}

export const SignaturePad = ({ onSave, existingSignature, label }: SignaturePadProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [showCanvas, setShowCanvas] = useState(!existingSignature);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    canvas.width = 400;
    canvas.height = 150;

    // Fill white background
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Draw border
      ctx.strokeStyle = "#cccccc";
      ctx.strokeRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsDrawing(true);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Keep signature strokes solid black even after drawing the gray border.
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ("touches" in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ("touches" in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
    setIsEmpty(false);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#cccccc";
      ctx.strokeRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }

    setIsEmpty(true);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) {
      alert("Please sign before saving.");
      return;
    }

    const dataUrl = canvas.toDataURL("image/png");
    onSave(dataUrl);
    setShowCanvas(false);
  };

  const editSignature = () => {
    setShowCanvas(true);
    clearSignature();
  };

  return (
    <div style={{ marginBottom: "16px", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "12px", backgroundColor: "#f9fafb" }}>
      <label style={{ display: "block", marginBottom: "8px", fontWeight: 600, fontSize: "13px", color: "#000000" }}>
        {label}
      </label>

      {showCanvas ? (
        <div>
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            style={{
              border: "2px dashed #999",
              borderRadius: "6px",
              cursor: "crosshair",
              marginBottom: "8px",
              width: "100%",
              maxWidth: "400px",
              height: "auto",
              backgroundColor: "#fff"
            }}
          />
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={clearSignature}
              style={{
                padding: "6px 12px",
                backgroundColor: "#6b7280",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                fontSize: "12px",
                cursor: "pointer"
              }}
            >
              Clear
            </button>
            <button
              type="button"
              onClick={saveSignature}
              disabled={isEmpty}
              style={{
                padding: "6px 12px",
                backgroundColor: isEmpty ? "#d1d5db" : "#3b82f6",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                fontSize: "12px",
                cursor: isEmpty ? "not-allowed" : "pointer"
              }}
            >
              Save Signature
            </button>
          </div>
        </div>
      ) : existingSignature ? (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <img
            src={existingSignature}
            alt="Signature"
            style={{
              maxWidth: "200px",
              height: "auto",
              border: "1px solid #d1d5db",
              borderRadius: "4px",
              padding: "4px",
              backgroundColor: "#fff"
            }}
          />
          <button
            type="button"
            onClick={editSignature}
            style={{
              padding: "6px 12px",
              backgroundColor: "#f59e0b",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              fontSize: "12px",
              cursor: "pointer"
            }}
          >
            Edit
          </button>
        </div>
      ) : (
        <div style={{ color: "#000000", fontSize: "12px", padding: "8px" }}>
          No signature yet.
        </div>
      )}
    </div>
  );
};
