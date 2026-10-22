import { describe, expect, it } from "vitest";
import { reminderWhen, reminderWindow } from "./reminders";

describe("reminderWindow", () => {
  it("usa el día de Madrid, no el de UTC", () => {
    // 23:30 UTC del 26-oct ya es 27-oct en Madrid (UTC+1 en horario de invierno).
    expect(reminderWindow(new Date("2026-10-26T23:30:00Z"))).toEqual({ today: "2026-10-27", tomorrow: "2026-10-28" });
  });

  it("cruza el fin de mes", () => {
    expect(reminderWindow(new Date("2026-10-31T07:00:00Z"))).toEqual({ today: "2026-10-31", tomorrow: "2026-11-01" });
  });
});

describe("reminderWhen", () => {
  const days = { today: "2026-10-27", tomorrow: "2026-10-28" };

  it("hoy y mañana", () => {
    expect(reminderWhen("2026-10-27", days)).toBe("hoy");
    expect(reminderWhen("2026-10-28", days)).toBe("mañana");
  });

  it("las vencidas y las lejanas no se avisan", () => {
    expect(reminderWhen("2026-10-20", days)).toBeNull();
    expect(reminderWhen("2026-10-29", days)).toBeNull();
  });
});
