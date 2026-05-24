var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => TastingPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  notesFolder: "Tasting Notes"
};
var DRINK_TYPES = ["Wine", "Whisky", "Beer", "Other"];
var WINE_COLOURS = ["red", "white", "rose", "sparkling", "dessert"];
var VIEW_TYPE_TN = "tasting-notes-sidebar";
function safeName(s) {
  return s.replace(/[\\/:*?"<>|]/g, "-");
}
function today() {
  return new Date().toISOString().split("T")[0];
}
async function ensureFolder(app, path) {
  await app.vault.createFolder(path).catch(() => {
  });
}
var TastingView = class extends import_obsidian.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.activeTab = "all";
    this.plugin = plugin;
  }
  getViewType() {
    return VIEW_TYPE_TN;
  }
  getDisplayText() {
    return "Tasting Notes";
  }
  getIcon() {
    return "wine";
  }
  async onOpen() {
    await this.render();
  }
  async onClose() {
  }
  async render() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("tn-container");
    const header = contentEl.createDiv({ cls: "tn-header" });
    header.createEl("h2", { text: "Tasting Notes" });
    const addBtn = header.createEl("button", { text: "+", cls: "tn-btn-primary" });
    addBtn.title = "New Tasting Note";
    addBtn.onclick = () => new TastingModal(this.app, this.plugin, () => this.render()).open();
    const tabs = contentEl.createDiv({ cls: "tn-tabs" });
    const makeTab = (label, tab) => {
      const btn = tabs.createEl("button", { text: label, cls: "tn-tab" });
      if (this.activeTab === tab)
        btn.addClass("active");
      btn.onclick = () => {
        this.activeTab = tab;
        this.renderList(list);
      };
    };
    makeTab("All", "all");
    makeTab("Wine", "wine");
    makeTab("Whisky", "whisky");
    const list = contentEl.createDiv({ cls: "tn-list" });
    await this.renderList(list);
  }
  async renderList(container) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    container.empty();
    const folder = this.plugin.settings.notesFolder;
    let files = this.app.vault.getMarkdownFiles().filter(
      (f) => f.path.startsWith(folder + "/")
    );
    if (this.activeTab === "wine") {
      files = files.filter((f) => {
        var _a2, _b2, _c2;
        const fm = (_b2 = (_a2 = this.app.metadataCache.getFileCache(f)) == null ? void 0 : _a2.frontmatter) != null ? _b2 : {};
        return ((_c2 = fm["type"]) != null ? _c2 : "").toLowerCase() === "wine";
      });
    } else if (this.activeTab === "whisky") {
      files = files.filter((f) => {
        var _a2, _b2, _c2;
        const fm = (_b2 = (_a2 = this.app.metadataCache.getFileCache(f)) == null ? void 0 : _a2.frontmatter) != null ? _b2 : {};
        return ((_c2 = fm["type"]) != null ? _c2 : "").toLowerCase() === "whisky";
      });
    }
    files.sort((a, b) => {
      var _a2, _b2, _c2, _d2, _e2, _f2;
      const ra = (_c2 = (_b2 = (_a2 = this.app.metadataCache.getFileCache(a)) == null ? void 0 : _a2.frontmatter) == null ? void 0 : _b2["rating"]) != null ? _c2 : 0;
      const rb = (_f2 = (_e2 = (_d2 = this.app.metadataCache.getFileCache(b)) == null ? void 0 : _d2.frontmatter) == null ? void 0 : _e2["rating"]) != null ? _f2 : 0;
      return Number(rb) - Number(ra);
    });
    if (files.length === 0) {
      container.createEl("p", { cls: "tn-empty", text: "No tasting notes found." });
      return;
    }
    for (const file of files) {
      const fm = (_b = (_a = this.app.metadataCache.getFileCache(file)) == null ? void 0 : _a.frontmatter) != null ? _b : {};
      const type = (_c = fm["type"]) != null ? _c : "";
      const producer = (_d = fm["producer"]) != null ? _d : "";
      const rating = (_e = fm["rating"]) != null ? _e : 0;
      const vintage = (_g = (_f = fm["vintage"]) != null ? _f : fm["age"]) != null ? _g : "";
      const inCellar = (_h = fm["in_cellar"]) != null ? _h : false;
      const card = container.createDiv({ cls: "tn-card" });
      const row = card.createDiv({ cls: "tn-card-row" });
      const title = row.createDiv({ cls: "tn-card-title", text: file.basename });
      title.onclick = () => this.app.workspace.openLinkText(file.path, "", false);
      if (rating)
        row.createDiv({ cls: "tn-score", text: String(rating) });
      if (producer)
        card.createDiv({ cls: "tn-card-producer", text: producer });
      const meta = card.createDiv({ cls: "tn-card-meta" });
      if (type) {
        const cls = type.toLowerCase() === "wine" ? "tn-badge tn-badge-wine" : type.toLowerCase() === "whisky" ? "tn-badge tn-badge-whisky" : "tn-badge";
        meta.createSpan({ cls, text: type });
      }
      if (vintage)
        meta.createSpan({ cls: "tn-badge", text: vintage });
      if (inCellar)
        meta.createSpan({ cls: "tn-badge tn-badge-cellar", text: "In Cellar" });
    }
  }
};
var TastingModal = class extends import_obsidian.Modal {
  constructor(app, plugin, onSave) {
    super(app);
    this.type = "Wine";
    this.name = "";
    this.producer = "";
    this.country = "";
    this.region = "";
    this.vintage = "";
    this.price = "";
    this.rating = "";
    this.nose = "";
    this.palate = "";
    this.finish = "";
    this.notes = "";
    this.wouldBuyAgain = true;
    // Wine-specific
    this.colour = "red";
    this.grapes = "";
    // Whisky-specific
    this.distillery = "";
    this.ageStatement = "";
    this.abv = "";
    this.caskType = "";
    // Dynamic content area
    this.typeSection = null;
    this.container = null;
    this.plugin = plugin;
    this.onSave = onSave;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.addClass("tn-modal");
    contentEl.createEl("h2", { text: "New Tasting Note" });
    new import_obsidian.Setting(contentEl).setName("Type").addDropdown((d) => {
      DRINK_TYPES.forEach((t) => d.addOption(t, t));
      d.setValue(this.type);
      d.onChange((v) => {
        this.type = v;
        this.renderTypeSection();
      });
    });
    new import_obsidian.Setting(contentEl).setName("Name").addText((t) => {
      t.setPlaceholder("e.g. Chateau Margaux 2015").onChange((v) => this.name = v);
    });
    new import_obsidian.Setting(contentEl).setName("Producer").addText((t) => {
      t.setPlaceholder("e.g. Chateau Margaux").onChange((v) => this.producer = v);
    });
    new import_obsidian.Setting(contentEl).setName("Country").addText((t) => {
      t.setPlaceholder("e.g. France").onChange((v) => this.country = v);
    });
    new import_obsidian.Setting(contentEl).setName("Region").addText((t) => {
      t.setPlaceholder("e.g. Bordeaux").onChange((v) => this.region = v);
    });
    new import_obsidian.Setting(contentEl).setName("Vintage / Age").addText((t) => {
      t.setPlaceholder("e.g. 2015 or 12 Year").onChange((v) => this.vintage = v);
    });
    new import_obsidian.Setting(contentEl).setName("Price").addText((t) => {
      t.setPlaceholder("e.g. R450").onChange((v) => this.price = v);
    });
    new import_obsidian.Setting(contentEl).setName("Rating (1-100)").addText((t) => {
      t.setPlaceholder("e.g. 92").onChange((v) => this.rating = v);
    });
    this.typeSection = contentEl.createDiv();
    this.renderTypeSection();
    new import_obsidian.Setting(contentEl).setName("Nose").addTextArea((t) => {
      t.inputEl.addClass("tn-textarea");
      t.inputEl.rows = 2;
      t.setPlaceholder("Aromas...").onChange((v) => this.nose = v);
    });
    new import_obsidian.Setting(contentEl).setName("Palate").addTextArea((t) => {
      t.inputEl.addClass("tn-textarea");
      t.inputEl.rows = 2;
      t.setPlaceholder("Taste...").onChange((v) => this.palate = v);
    });
    new import_obsidian.Setting(contentEl).setName("Finish").addTextArea((t) => {
      t.inputEl.addClass("tn-textarea");
      t.inputEl.rows = 2;
      t.setPlaceholder("Finish and length...").onChange((v) => this.finish = v);
    });
    new import_obsidian.Setting(contentEl).setName("Overall Notes").addTextArea((t) => {
      t.inputEl.addClass("tn-textarea");
      t.inputEl.rows = 3;
      t.setPlaceholder("Overall impressions...").onChange((v) => this.notes = v);
    });
    new import_obsidian.Setting(contentEl).setName("Would buy again?").addToggle((t) => {
      t.setValue(true).onChange((v) => this.wouldBuyAgain = v);
    });
    new import_obsidian.Setting(contentEl).addButton(
      (b) => b.setButtonText("Save Tasting Note").setCta().onClick(() => this.save())
    );
  }
  renderTypeSection() {
    if (!this.typeSection)
      return;
    this.typeSection.empty();
    if (this.type === "Wine") {
      new import_obsidian.Setting(this.typeSection).setName("Colour").addDropdown((d) => {
        WINE_COLOURS.forEach((c) => d.addOption(c, c));
        d.setValue(this.colour);
        d.onChange((v) => this.colour = v);
      });
      new import_obsidian.Setting(this.typeSection).setName("Grape Varieties").addText((t) => {
        t.setPlaceholder("e.g. Cabernet Sauvignon, Merlot").onChange((v) => this.grapes = v);
      });
    } else if (this.type === "Whisky") {
      new import_obsidian.Setting(this.typeSection).setName("Distillery").addText((t) => {
        t.setPlaceholder("e.g. Glenfiddich").onChange((v) => this.distillery = v);
      });
      new import_obsidian.Setting(this.typeSection).setName("Age Statement").addText((t) => {
        t.setPlaceholder("e.g. 18 Year").onChange((v) => this.ageStatement = v);
      });
      new import_obsidian.Setting(this.typeSection).setName("ABV (%)").addText((t) => {
        t.setPlaceholder("e.g. 43").onChange((v) => this.abv = v);
      });
      new import_obsidian.Setting(this.typeSection).setName("Cask Type").addText((t) => {
        t.setPlaceholder("e.g. Sherry, Ex-Bourbon").onChange((v) => this.caskType = v);
      });
    }
  }
  async save() {
    if (!this.name.trim()) {
      new import_obsidian.Notice("Name is required.");
      return;
    }
    const folder = this.plugin.settings.notesFolder;
    await ensureFolder(this.app, folder);
    const safeFn = safeName(`${this.type}-${this.name}`);
    const path = `${folder}/${safeFn}.md`;
    if (this.app.vault.getAbstractFileByPath(path)) {
      new import_obsidian.Notice("A tasting note with that name already exists.");
      return;
    }
    const lines = [
      "---",
      `title: "${this.name}"`,
      `type: ${this.type}`,
      `producer: "${this.producer}"`,
      `country: "${this.country}"`,
      `region: "${this.region}"`,
      `vintage: "${this.vintage}"`,
      `price: "${this.price}"`,
      `rating: ${this.rating || 0}`,
      `would_buy_again: ${this.wouldBuyAgain}`,
      `in_cellar: false`,
      `created: ${today()}`
    ];
    if (this.type === "Wine") {
      lines.push(`colour: ${this.colour}`);
      lines.push(`grapes: "${this.grapes}"`);
    } else if (this.type === "Whisky") {
      lines.push(`distillery: "${this.distillery}"`);
      lines.push(`age_statement: "${this.ageStatement}"`);
      lines.push(`abv: "${this.abv}"`);
      lines.push(`cask_type: "${this.caskType}"`);
    }
    lines.push("---", "", `# ${this.name}`, "");
    lines.push("| Field | Detail |", "| --- | --- |");
    lines.push(`| Type | ${this.type} |`);
    lines.push(`| Producer | ${this.producer} |`);
    lines.push(`| Country | ${this.country} |`);
    lines.push(`| Region | ${this.region} |`);
    lines.push(`| Vintage / Age | ${this.vintage} |`);
    lines.push(`| Price | ${this.price} |`);
    lines.push(`| Rating | **${this.rating}/100** |`);
    lines.push(`| Would Buy Again | ${this.wouldBuyAgain ? "Yes" : "No"} |`);
    if (this.type === "Wine") {
      lines.push(`| Colour | ${this.colour} |`);
      lines.push(`| Grapes | ${this.grapes} |`);
    } else if (this.type === "Whisky") {
      lines.push(`| Distillery | ${this.distillery} |`);
      lines.push(`| Age Statement | ${this.ageStatement} |`);
      lines.push(`| ABV | ${this.abv}% |`);
      lines.push(`| Cask Type | ${this.caskType} |`);
    }
    lines.push("", "## Tasting Notes", "");
    lines.push(`**Nose:** ${this.nose}`, "");
    lines.push(`**Palate:** ${this.palate}`, "");
    lines.push(`**Finish:** ${this.finish}`, "");
    lines.push("### Overall", "", this.notes);
    await this.app.vault.create(path, lines.join("\n"));
    new import_obsidian.Notice(`Tasting note for "${this.name}" saved.`);
    this.close();
    this.onSave();
  }
  onClose() {
    this.contentEl.empty();
  }
};
var CellarModal = class extends import_obsidian.Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "Add to Cellar" });
    const folder = this.plugin.settings.notesFolder;
    const files = this.app.vault.getMarkdownFiles().filter(
      (f) => f.path.startsWith(folder + "/")
    );
    let selectedFile = null;
    let quantity = "1";
    let purchaseDate = today();
    new import_obsidian.Setting(contentEl).setName("Tasting Note").addDropdown((d) => {
      d.addOption("", "-- Select --");
      for (const f of files)
        d.addOption(f.path, f.basename);
      d.onChange((v) => {
        var _a;
        selectedFile = (_a = files.find((f) => f.path === v)) != null ? _a : null;
      });
    });
    new import_obsidian.Setting(contentEl).setName("Quantity").addText((t) => {
      t.setValue("1").onChange((v) => quantity = v);
    });
    new import_obsidian.Setting(contentEl).setName("Purchase Date").addText((t) => {
      t.setValue(purchaseDate).onChange((v) => purchaseDate = v);
    });
    new import_obsidian.Setting(contentEl).addButton(
      (b) => b.setButtonText("Add to Cellar").setCta().onClick(async () => {
        if (!selectedFile) {
          new import_obsidian.Notice("Please select a tasting note.");
          return;
        }
        let content = await this.app.vault.read(selectedFile);
        content = content.replace(/^in_cellar: .*/m, "in_cellar: true").replace(/^---\n/, `---
cellar_quantity: ${quantity}
cellar_date: ${purchaseDate}
`);
        if (!content.includes("cellar_quantity:")) {
          content = content.replace(/^---\n/, `---
cellar_quantity: ${quantity}
cellar_date: ${purchaseDate}
`);
        }
        if (!content.includes("## Cellar")) {
          content += `

## Cellar

**Quantity:** ${quantity}  
**Purchased:** ${purchaseDate}`;
        }
        await this.app.vault.modify(selectedFile, content);
        new import_obsidian.Notice(`"${selectedFile.basename}" added to cellar (qty: ${quantity}).`);
        this.close();
      })
    );
  }
  onClose() {
    this.contentEl.empty();
  }
};
var TastingSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Tasting Notes Settings" });
    new import_obsidian.Setting(containerEl).setName("Tasting notes folder").setDesc("Folder where tasting notes are stored.").addText(
      (t) => t.setValue(this.plugin.settings.notesFolder).onChange(async (v) => {
        this.plugin.settings.notesFolder = v;
        await this.plugin.saveSettings();
      })
    );
  }
};
var TastingPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
  }
  async onload() {
    await this.loadSettings();
    this.registerView(VIEW_TYPE_TN, (leaf) => new TastingView(leaf, this));
    this.addRibbonIcon("wine", "Tasting Notes", () => this.activateSidebar());
    this.addCommand({
      id: "open-sidebar",
      name: "Open Tasting Sidebar",
      callback: () => this.activateSidebar()
    });
    this.addCommand({
      id: "new-tasting-note",
      name: "New Tasting Note",
      callback: () => new TastingModal(this.app, this, () => this.refreshSidebar()).open()
    });
    this.addCommand({
      id: "add-to-cellar",
      name: "Add to Cellar",
      callback: () => new CellarModal(this.app, this).open()
    });
    this.addSettingTab(new TastingSettingTab(this.app, this));
  }
  async activateSidebar() {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_TN);
    if (existing.length) {
      this.app.workspace.revealLeaf(existing[0]);
      return;
    }
    const leaf = this.app.workspace.getRightLeaf(false);
    if (leaf) {
      await leaf.setViewState({ type: VIEW_TYPE_TN, active: true });
      this.app.workspace.revealLeaf(leaf);
    }
  }
  refreshSidebar() {
    this.app.workspace.getLeavesOfType(VIEW_TYPE_TN).forEach((leaf) => {
      if (leaf.view instanceof TastingView)
        leaf.view.render();
    });
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
};
