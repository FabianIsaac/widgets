import { App, PluginSettingTab, Setting } from "obsidian";
import type ObsidianWidgetsPlugin from "../../main";
import { t, changeLanguage } from "@infrastructure/i18n/i18n";
import { TAG_COLOR_OPTIONS, type TagColorEntry, type LinkColorEntry } from "./SettingsManager";

/**
 * Settings tab for the Obsidian Widgets plugin.
 */
export class WidgetSettingsTab extends PluginSettingTab {
  private readonly plugin: ObsidianWidgetsPlugin;

  constructor(app: App, plugin: ObsidianWidgetsPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: t("settings.title") });

    // ── Language ──
    new Setting(containerEl)
      .setName(t("settings.language"))
      .setDesc(t("settings.languageDesc"))
      .addDropdown((dropdown) => {
        dropdown
          .addOption("auto", t("settings.languageAuto"))
          .addOption("en", "English")
          .addOption("es", "Español")
          .setValue(this.plugin.settingsManager.get().language)
          .onChange(async (value) => {
            await this.plugin.settingsManager.update({ language: value });
            await changeLanguage(value);
            this.display();
          });
      });

    // ── Default weather location ──
    containerEl.createEl("h3", { text: t("settings.weatherHeading") });

    new Setting(containerEl)
      .setName(t("settings.latitude"))
      .setDesc(t("settings.latitudeDesc"))
      .addText((text) => {
        text
          .setPlaceholder("e.g. -33.511")
          .setValue(this.plugin.settingsManager.get().latitude)
          .onChange(async (value) => {
            await this.plugin.settingsManager.update({ latitude: value.trim() });
          });
      });

    new Setting(containerEl)
      .setName(t("settings.longitude"))
      .setDesc(t("settings.longitudeDesc"))
      .addText((text) => {
        text
          .setPlaceholder("e.g. -70.631")
          .setValue(this.plugin.settingsManager.get().longitude)
          .onChange(async (value) => {
            await this.plugin.settingsManager.update({ longitude: value.trim() });
          });
      });

    new Setting(containerEl)
      .setName(t("settings.location"))
      .setDesc(t("settings.locationDesc"))
      .addText((text) => {
        text
          .setPlaceholder("e.g. San Joaquín")
          .setValue(this.plugin.settingsManager.get().location)
          .onChange(async (value) => {
            await this.plugin.settingsManager.update({ location: value.trim() });
          });
      });

    new Setting(containerEl)
      .setName(t("settings.units"))
      .setDesc(t("settings.unitsDesc"))
      .addDropdown((dropdown) => {
        dropdown
          .addOption("celsius", "Celsius (°C)")
          .addOption("fahrenheit", "Fahrenheit (°F)")
          .setValue(this.plugin.settingsManager.get().units)
          .onChange(async (value) => {
            await this.plugin.settingsManager.update({ units: value as "celsius" | "fahrenheit" });
          });
      });

    // ── Tag colors (monthly calendar) ──
    containerEl.createEl("h3", { text: t("settings.tagColorsHeading") });
    containerEl.createEl("p", {
      cls: "setting-item-description",
      text: t("settings.tagColorsDesc"),
    });

    const tagColors = this.plugin.settingsManager.get().tagColors;

    // Render existing entries
    for (let i = 0; i < tagColors.length; i++) {
      this.renderTagColorEntry(containerEl, tagColors, i);
    }

    // Add new entry button
    new Setting(containerEl).addButton((btn) => {
      btn
        .setButtonText(t("settings.tagColorsAdd"))
        .setCta()
        .onClick(async () => {
          const updated = [
            ...this.plugin.settingsManager.get().tagColors,
            { tag: "", color: "blue" } as TagColorEntry,
          ];
          await this.plugin.settingsManager.update({ tagColors: updated });
          this.display();
        });
    });

    // ── Link colors (monthly calendar) ──
    containerEl.createEl("h3", { text: t("settings.linkColorsHeading") });
    containerEl.createEl("p", {
      cls: "setting-item-description",
      text: t("settings.linkColorsDesc"),
    });

    const linkColors = this.plugin.settingsManager.get().linkColors;

    for (let i = 0; i < linkColors.length; i++) {
      this.renderLinkColorEntry(containerEl, linkColors, i);
    }

    new Setting(containerEl).addButton((btn) => {
      btn
        .setButtonText(t("settings.linkColorsAdd"))
        .setCta()
        .onClick(async () => {
          const updated = [
            ...this.plugin.settingsManager.get().linkColors,
            { link: "", color: "green" } as LinkColorEntry,
          ];
          await this.plugin.settingsManager.update({ linkColors: updated });
          this.display();
        });
    });
  }

  private renderLinkColorEntry(
    containerEl: HTMLElement,
    linkColors: LinkColorEntry[],
    index: number
  ): void {
    const entry = linkColors[index];

    const setting = new Setting(containerEl)
      .addText((text) => {
        text
          .setPlaceholder("Nombre del archivo")
          .setValue(entry.link)
          .onChange(async (value) => {
            const updated = [...this.plugin.settingsManager.get().linkColors];
            updated[index] = { ...updated[index], link: value.trim() };
            await this.plugin.settingsManager.update({ linkColors: updated });
          });
      })
      .addText((text) => {
        text
          .setPlaceholder("Alias (opcional)")
          .setValue(entry.alias ?? "")
          .onChange(async (value) => {
            const updated = [...this.plugin.settingsManager.get().linkColors];
            updated[index] = { ...updated[index], alias: value.trim() || undefined };
            await this.plugin.settingsManager.update({ linkColors: updated });
          });
      })
      .addDropdown((dropdown) => {
        TAG_COLOR_OPTIONS.forEach(({ value, label }) => dropdown.addOption(value, label));
        dropdown.setValue(entry.color).onChange(async (value) => {
          const updated = [...this.plugin.settingsManager.get().linkColors];
          updated[index] = { ...updated[index], color: value };
          await this.plugin.settingsManager.update({ linkColors: updated });
        });
      })
      .addExtraButton((btn) => {
        btn
          .setIcon("trash")
          .setTooltip(t("settings.linkColorsRemove"))
          .onClick(async () => {
            const updated = this.plugin.settingsManager.get().linkColors.filter((_, i) => i !== index);
            await this.plugin.settingsManager.update({ linkColors: updated });
            this.display();
          });
      });

    const colorSwatch = setting.controlEl.createDiv({ cls: "widget-settings__color-swatch" });
    colorSwatch.style.setProperty("--swatch-color", `var(--color-${entry.color})`);
  }

  private renderTagColorEntry(
    containerEl: HTMLElement,
    tagColors: TagColorEntry[],
    index: number
  ): void {
    const entry = tagColors[index];

    const setting = new Setting(containerEl)
      .addText((text) => {
        text
          .setPlaceholder("tag-name")
          .setValue(entry.tag)
          .onChange(async (value) => {
            const updated = [...this.plugin.settingsManager.get().tagColors];
            updated[index] = { ...updated[index], tag: value.trim() };
            await this.plugin.settingsManager.update({ tagColors: updated });
          });
      })
      .addDropdown((dropdown) => {
        TAG_COLOR_OPTIONS.forEach(({ value, label }) => dropdown.addOption(value, label));
        dropdown.setValue(entry.color).onChange(async (value) => {
          const updated = [...this.plugin.settingsManager.get().tagColors];
          updated[index] = { ...updated[index], color: value };
          await this.plugin.settingsManager.update({ tagColors: updated });
        });
      })
      .addExtraButton((btn) => {
        btn
          .setIcon("trash")
          .setTooltip(t("settings.tagColorsRemove"))
          .onClick(async () => {
            const updated = this.plugin.settingsManager.get().tagColors.filter((_, i) => i !== index);
            await this.plugin.settingsManager.update({ tagColors: updated });
            this.display();
          });
      });

    // Color swatch preview
    const colorSwatch = setting.controlEl.createDiv({ cls: "widget-settings__color-swatch" });
    colorSwatch.style.setProperty("--swatch-color", `var(--color-${entry.color})`);
  }
}
