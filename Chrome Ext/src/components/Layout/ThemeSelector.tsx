import React from "react";
import { Select, Tooltip } from "antd";
import { QA_THEMES } from "../../themes";
import { useDashboardStore } from "../../store/useStore";

const ThemeSelector: React.FC = () => {
  const { themeId, setTheme } = useDashboardStore();

  return (
    <Tooltip title="Select Theme" placement="right">
      <Select
        value={themeId}
        onChange={setTheme}
        size="small"
        style={{
          width: "100%",
          marginTop: 8,
        }}
        popupMatchSelectWidth={false}
        options={QA_THEMES.map((t) => ({
          value: t.id,
          label: (
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span>{t.icon}</span>
              <span style={{ fontSize: 12 }}>{t.name}</span>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: t.primaryColor,
                  display: "inline-block",
                  marginLeft: "auto",
                }}
              />
            </span>
          ),
        }))}
      />
    </Tooltip>
  );
};

export default ThemeSelector;
