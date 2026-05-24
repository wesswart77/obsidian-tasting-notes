import {
	App,
	ItemView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	WorkspaceLeaf,
} from "obsidian";

// ─── Types ──────────────────────────────────────────────────────────────────

interface TastingSettings {
	notesFolder: string;
}

const DEFAULT_SETTINGS: TastingSettings = {
	notesFolder: "Tasting Notes",
};

type DrinkType = "Wine" | "Whisky" | "Beer" | "Other";
const DRINK_TYPES: DrinkType[] = ["Wine", "Whisky", "Beer", "Other"];

type WineColour = "red" | "white" | "rose" | "sparkling" | "dessert";
const WINE_COLOURS: WineColour[] = ["red", "white", "rose", "sparkling", "dessert"];

const VIEW_TYPE_TN = "tasting-notes-sidebar";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function safeName(s: string) { return s.replace(/[\\/:*?"<>|]/g, "-"); }
function today() { return new Date().toISOString().split("T")[0]; }

async function ensureFolder(app: App, path: string) {
	await app.vault.createFolder(path).catch(() => {});
}

// ─── Sidebar View ─────────────────────────────────────────────────────────────

class TastingView extends ItemView {
	plugin: TastingPlugin;
	private activeTab: "all" | "wine" | "whisky" = "all";

	constructor(leaf: WorkspaceLeaf, plugin: TastingPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType() { return VIEW_TYPE_TN; }
	getDisplayText() { return "Tasting Notes"; }
	getIcon() { return "wine"; }

	async onOpen() { await this.render(); }
	async onClose() {}

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
		const makeTab = (label: string, tab: "all" | "wine" | "whisky") => {
			const btn = tabs.createEl("button", { text: label, cls: "tn-tab" });
			if (this.activeTab === tab) btn.addClass("active");
			btn.onclick = () => { this.activeTab = tab; this.renderList(list); };
		};
		makeTab("All", "all");
		makeTab("Wine", "wine");
		makeTab("Whisky", "whisky");

		const list = contentEl.createDiv({ cls: "tn-list" });
		await this.renderList(list);
	}

	async renderList(container: HTMLElement) {
		container.empty();
		const folder = this.plugin.settings.notesFolder;

		let files = this.app.vault.getMarkdownFiles().filter((f) =>
			f.path.startsWith(folder + "/")
		);

		if (this.activeTab === "wine") {
			files = files.filter((f) => {
				const fm = this.app.metadataCache.getFileCache(f)?.frontmatter ?? {};
				return (fm["type"] ?? "").toLowerCase() === "wine";
			});
		} else if (this.activeTab === "whisky") {
			files = files.filter((f) => {
				const fm = this.app.metadataCache.getFileCache(f)?.frontmatter ?? {};
				return (fm["type"] ?? "").toLowerCase() === "whisky";
			});
		}

		// Sort by rating descending
		files.sort((a, b) => {
			const ra = this.app.metadataCache.getFileCache(a)?.frontmatter?.["rating"] ?? 0;
			const rb = this.app.metadataCache.getFileCache(b)?.frontmatter?.["rating"] ?? 0;
			return Number(rb) - Number(ra);
		});

		if (files.length === 0) {
			container.createEl("p", { cls: "tn-empty", text: "No tasting notes found." });
			return;
		}

		for (const file of files) {
			const fm = this.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
			const type: string = fm["type"] ?? "";
			const producer: string = fm["producer"] ?? "";
			const rating: number = fm["rating"] ?? 0;
			const vintage: string = fm["vintage"] ?? fm["age"] ?? "";
			const inCellar: boolean = fm["in_cellar"] ?? false;

			const card = container.createDiv({ cls: "tn-card" });
			const row = card.createDiv({ cls: "tn-card-row" });
			const title = row.createDiv({ cls: "tn-card-title", text: file.basename });
			title.onclick = () => this.app.workspace.openLinkText(file.path, "", false);
			if (rating) row.createDiv({ cls: "tn-score", text: String(rating) });

			if (producer) card.createDiv({ cls: "tn-card-producer", text: producer });

			const meta = card.createDiv({ cls: "tn-card-meta" });
			if (type) {
				const cls = type.toLowerCase() === "wine" ? "tn-badge tn-badge-wine"
					: type.toLowerCase() === "whisky" ? "tn-badge tn-badge-whisky"
					: "tn-badge";
				meta.createSpan({ cls, text: type });
			}
			if (vintage) meta.createSpan({ cls: "tn-badge", text: vintage });
			if (inCellar) meta.createSpan({ cls: "tn-badge tn-badge-cellar", text: "In Cellar" });
		}
	}
}

// ─── New Tasting Note Modal ───────────────────────────────────────────────────

class TastingModal extends Modal {
	plugin: TastingPlugin;
	onSave: () => void;

	private type: DrinkType = "Wine";
	private name = "";
	private producer = "";
	private country = "";
	private region = "";
	private vintage = "";
	private price = "";
	private rating = "";
	private nose = "";
	private palate = "";
	private finish = "";
	private notes = "";
	private wouldBuyAgain = true;

	// Wine-specific
	private colour: WineColour = "red";
	private grapes = "";

	// Whisky-specific
	private distillery = "";
	private ageStatement = "";
	private abv = "";
	private caskType = "";

	// Dynamic content area
	private typeSection: HTMLElement | null = null;
	private container: HTMLElement | null = null;

	constructor(app: App, plugin: TastingPlugin, onSave: () => void) {
		super(app);
		this.plugin = plugin;
		this.onSave = onSave;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.addClass("tn-modal");
		contentEl.createEl("h2", { text: "New Tasting Note" });

		new Setting(contentEl).setName("Type").addDropdown((d) => {
			DRINK_TYPES.forEach((t) => d.addOption(t, t));
			d.setValue(this.type);
			d.onChange((v) => {
				this.type = v as DrinkType;
				this.renderTypeSection();
			});
		});

		new Setting(contentEl).setName("Name").addText((t) => {
			t.setPlaceholder("e.g. Chateau Margaux 2015").onChange((v) => (this.name = v));
		});

		new Setting(contentEl).setName("Producer").addText((t) => {
			t.setPlaceholder("e.g. Chateau Margaux").onChange((v) => (this.producer = v));
		});

		new Setting(contentEl).setName("Country").addText((t) => {
			t.setPlaceholder("e.g. France").onChange((v) => (this.country = v));
		});

		new Setting(contentEl).setName("Region").addText((t) => {
			t.setPlaceholder("e.g. Bordeaux").onChange((v) => (this.region = v));
		});

		new Setting(contentEl).setName("Vintage / Age").addText((t) => {
			t.setPlaceholder("e.g. 2015 or 12 Year").onChange((v) => (this.vintage = v));
		});

		new Setting(contentEl).setName("Price").addText((t) => {
			t.setPlaceholder("e.g. R450").onChange((v) => (this.price = v));
		});

		new Setting(contentEl).setName("Rating (1-100)").addText((t) => {
			t.setPlaceholder("e.g. 92").onChange((v) => (this.rating = v));
		});

		// Type-specific section (inserted here)
		this.typeSection = contentEl.createDiv();
		this.renderTypeSection();

		new Setting(contentEl).setName("Nose").addTextArea((t) => {
			t.inputEl.addClass("tn-textarea");
			t.inputEl.rows = 2;
			t.setPlaceholder("Aromas...").onChange((v) => (this.nose = v));
		});

		new Setting(contentEl).setName("Palate").addTextArea((t) => {
			t.inputEl.addClass("tn-textarea");
			t.inputEl.rows = 2;
			t.setPlaceholder("Taste...").onChange((v) => (this.palate = v));
		});

		new Setting(contentEl).setName("Finish").addTextArea((t) => {
			t.inputEl.addClass("tn-textarea");
			t.inputEl.rows = 2;
			t.setPlaceholder("Finish and length...").onChange((v) => (this.finish = v));
		});

		new Setting(contentEl).setName("Overall Notes").addTextArea((t) => {
			t.inputEl.addClass("tn-textarea");
			t.inputEl.rows = 3;
			t.setPlaceholder("Overall impressions...").onChange((v) => (this.notes = v));
		});

		new Setting(contentEl).setName("Would buy again?").addToggle((t) => {
			t.setValue(true).onChange((v) => (this.wouldBuyAgain = v));
		});

		new Setting(contentEl).addButton((b) =>
			b.setButtonText("Save Tasting Note").setCta().onClick(() => this.save())
		);
	}

	renderTypeSection() {
		if (!this.typeSection) return;
		this.typeSection.empty();

		if (this.type === "Wine") {
			new Setting(this.typeSection).setName("Colour").addDropdown((d) => {
				WINE_COLOURS.forEach((c) => d.addOption(c, c));
				d.setValue(this.colour);
				d.onChange((v) => (this.colour = v as WineColour));
			});
			new Setting(this.typeSection).setName("Grape Varieties").addText((t) => {
				t.setPlaceholder("e.g. Cabernet Sauvignon, Merlot").onChange((v) => (this.grapes = v));
			});
		} else if (this.type === "Whisky") {
			new Setting(this.typeSection).setName("Distillery").addText((t) => {
				t.setPlaceholder("e.g. Glenfiddich").onChange((v) => (this.distillery = v));
			});
			new Setting(this.typeSection).setName("Age Statement").addText((t) => {
				t.setPlaceholder("e.g. 18 Year").onChange((v) => (this.ageStatement = v));
			});
			new Setting(this.typeSection).setName("ABV (%)").addText((t) => {
				t.setPlaceholder("e.g. 43").onChange((v) => (this.abv = v));
			});
			new Setting(this.typeSection).setName("Cask Type").addText((t) => {
				t.setPlaceholder("e.g. Sherry, Ex-Bourbon").onChange((v) => (this.caskType = v));
			});
		}
	}

	async save() {
		if (!this.name.trim()) { new Notice("Name is required."); return; }

		const folder = this.plugin.settings.notesFolder;
		await ensureFolder(this.app, folder);

		const safeFn = safeName(`${this.type}-${this.name}`);
		const path = `${folder}/${safeFn}.md`;
		if (this.app.vault.getAbstractFileByPath(path)) {
			new Notice("A tasting note with that name already exists."); return;
		}

		const lines: string[] = [
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
			`created: ${today()}`,
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

		// Summary table
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
		new Notice(`Tasting note for "${this.name}" saved.`);
		this.close();
		this.onSave();
	}

	onClose() { this.contentEl.empty(); }
}

// ─── Add to Cellar Modal ──────────────────────────────────────────────────────

class CellarModal extends Modal {
	plugin: TastingPlugin;

	constructor(app: App, plugin: TastingPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h2", { text: "Add to Cellar" });

		const folder = this.plugin.settings.notesFolder;
		const files = this.app.vault.getMarkdownFiles().filter((f) =>
			f.path.startsWith(folder + "/")
		);

		let selectedFile: TFile | null = null;
		let quantity = "1";
		let purchaseDate = today();

		new Setting(contentEl).setName("Tasting Note").addDropdown((d) => {
			d.addOption("", "-- Select --");
			for (const f of files) d.addOption(f.path, f.basename);
			d.onChange((v) => {
				selectedFile = files.find((f) => f.path === v) ?? null;
			});
		});

		new Setting(contentEl).setName("Quantity").addText((t) => {
			t.setValue("1").onChange((v) => (quantity = v));
		});

		new Setting(contentEl).setName("Purchase Date").addText((t) => {
			t.setValue(purchaseDate).onChange((v) => (purchaseDate = v));
		});

		new Setting(contentEl).addButton((b) =>
			b.setButtonText("Add to Cellar").setCta().onClick(async () => {
				if (!selectedFile) { new Notice("Please select a tasting note."); return; }
				let content = await this.app.vault.read(selectedFile);

				// Update frontmatter
				content = content
					.replace(/^in_cellar: .*/m, "in_cellar: true")
					.replace(/^---\n/, `---\ncellar_quantity: ${quantity}\ncellar_date: ${purchaseDate}\n`);

				// Prevent duplicate keys — if cellar_quantity already exists, don't re-add header block
				if (!content.includes("cellar_quantity:")) {
					content = content.replace(/^---\n/, `---\ncellar_quantity: ${quantity}\ncellar_date: ${purchaseDate}\n`);
				}

				// Append cellar section if not present
				if (!content.includes("## Cellar")) {
					content += `\n\n## Cellar\n\n**Quantity:** ${quantity}  \n**Purchased:** ${purchaseDate}`;
				}

				await this.app.vault.modify(selectedFile, content);
				new Notice(`"${selectedFile.basename}" added to cellar (qty: ${quantity}).`);
				this.close();
			})
		);
	}

	onClose() { this.contentEl.empty(); }
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

class TastingSettingTab extends PluginSettingTab {
	plugin: TastingPlugin;

	constructor(app: App, plugin: TastingPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display() {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl("h2", { text: "Tasting Notes Settings" });

		new Setting(containerEl)
			.setName("Tasting notes folder")
			.setDesc("Folder where tasting notes are stored.")
			.addText((t) =>
				t.setValue(this.plugin.settings.notesFolder).onChange(async (v) => {
					this.plugin.settings.notesFolder = v;
					await this.plugin.saveSettings();
				})
			);
	}
}

// ─── Main Plugin ──────────────────────────────────────────────────────────────

export default class TastingPlugin extends Plugin {
	settings: TastingSettings = DEFAULT_SETTINGS;

	async onload() {
		await this.loadSettings();

		this.registerView(VIEW_TYPE_TN, (leaf) => new TastingView(leaf, this));

		this.addRibbonIcon("wine", "Tasting Notes", () => this.activateSidebar());

		this.addCommand({
			id: "open-sidebar",
			name: "Open Tasting Sidebar",
			callback: () => this.activateSidebar(),
		});

		this.addCommand({
			id: "new-tasting-note",
			name: "New Tasting Note",
			callback: () => new TastingModal(this.app, this, () => this.refreshSidebar()).open(),
		});

		this.addCommand({
			id: "add-to-cellar",
			name: "Add to Cellar",
			callback: () => new CellarModal(this.app, this).open(),
		});

		this.addSettingTab(new TastingSettingTab(this.app, this));
	}

	async activateSidebar() {
		const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_TN);
		if (existing.length) { this.app.workspace.revealLeaf(existing[0]); return; }
		const leaf = this.app.workspace.getRightLeaf(false);
		if (leaf) {
			await leaf.setViewState({ type: VIEW_TYPE_TN, active: true });
			this.app.workspace.revealLeaf(leaf);
		}
	}

	refreshSidebar() {
		this.app.workspace.getLeavesOfType(VIEW_TYPE_TN).forEach((leaf) => {
			if (leaf.view instanceof TastingView) leaf.view.render();
		});
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() { await this.saveData(this.settings); }
}
