import React, { useRef } from "react";
import { Card, Button, Tooltip } from "antd";
import { DownloadOutlined, FilePdfOutlined } from "@ant-design/icons";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface ChartCardProps {
  title: string;
  id: string;
  height?: number;
  extra?: React.ReactNode;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

const ChartCard: React.FC<ChartCardProps> = ({
  title,
  id,
  height = 280,
  extra,
  children,
  style,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  const downloadPNG = async () => {
    if (!ref.current) return;
    const canvas = await html2canvas(ref.current, {
      scale: 2,
      backgroundColor: null,
    });
    const link = document.createElement("a");
    link.download = `${id}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const downloadPDF = async () => {
    if (!ref.current) return;
    const canvas = await html2canvas(ref.current, {
      scale: 2,
      backgroundColor: "#1a1d27",
    });
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "px",
      format: [canvas.width / 2, canvas.height / 2],
    });
    pdf.addImage(
      canvas.toDataURL("image/png"),
      "PNG",
      0,
      0,
      canvas.width / 2,
      canvas.height / 2,
    );
    pdf.save(`${id}.pdf`);
  };

  return (
    <Card
      id={id}
      title={
        <span style={{ color: "var(--qa-text-primary)", fontWeight: 600 }}>
          {title}
        </span>
      }
      extra={
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {extra}
          <Tooltip title="Download PNG">
            <Button
              size="small"
              icon={<DownloadOutlined />}
              onClick={downloadPNG}
              style={{
                background: "transparent",
                border: "1px solid var(--qa-border)",
                color: "var(--qa-text-secondary)",
              }}
            />
          </Tooltip>
          <Tooltip title="Download PDF">
            <Button
              size="small"
              icon={<FilePdfOutlined />}
              onClick={downloadPDF}
              style={{
                background: "transparent",
                border: "1px solid var(--qa-border)",
                color: "var(--qa-text-secondary)",
              }}
            />
          </Tooltip>
        </div>
      }
      style={{
        background: "var(--qa-bg-card)",
        border: "1px solid var(--qa-border)",
        borderRadius: 12,
        ...style,
      }}
      styles={{ header: { borderBottom: "1px solid var(--qa-border)" } }}
    >
      <div ref={ref} style={{ height }}>
        {children}
      </div>
    </Card>
  );
};

export default ChartCard;
