const DB_NAME = "oc-library";
const DB_VERSION = 1;
const STORE = "characters";
const SNAPSHOT_KEY = "oc-library.snapshot.v4";
const HISTORY_KEY = "oc-library.history.v1";
const HISTORY_LIMIT = 8;

const state = {
  characters: [],
  activeId: null,
  filter: "all",
  query: "",
  saveTimer: null,
  db: null,
  editingTimelineId: null,
  draggedTimelineId: null,
  editingNetworkItemId: null,
  editingNetworkItemType: null,
  nodeDraftImage: "",
  editingComicId: null,
  comicDraftPages: [],
  draggedComicPageId: null,
  networkDrag: null,
  networkSuppressClick: false,
  lightboxItems: [],
  lightboxIndex: 0,
  lightboxPointerStartX: null,
  avatarCrop: null,
  lastPersistedSnapshot: "[]",
  restoringHistory: false,
};

const characterFields = ["name", "status", "tags"];
const variantFields = [
  "variantName",
  "world",
  "summary",
  "age",
  "species",
  "pronouns",
  "role",
  "personality",
  "appearance",
  "backstory",
  "detailedStory",
  "relationships",
  "notes",
];

const els = {
  editor: document.querySelector("#editor"),
  emptyState: document.querySelector("#emptyState"),
  characterList: document.querySelector("#characterList"),
  searchInput: document.querySelector("#searchInput"),
  saveState: document.querySelector("#saveState"),
  newCharacterBtn: document.querySelector("#newCharacterBtn"),
  emptyNewBtn: document.querySelector("#emptyNewBtn"),
  deleteBtn: document.querySelector("#deleteBtn"),
  undoBtn: document.querySelector("#undoBtn"),
  shareBtn: document.querySelector("#shareBtn"),
  exportBtn: document.querySelector("#exportBtn"),
  importInput: document.querySelector("#importInput"),
  avatarButton: document.querySelector("#avatarButton"),
  avatarInput: document.querySelector("#avatarInput"),
  avatarImage: document.querySelector("#avatarImage"),
  avatarPlaceholder: document.querySelector("#avatarPlaceholder"),
  clearAvatarBtn: document.querySelector("#clearAvatarBtn"),
  avatarCropper: document.querySelector("#avatarCropper"),
  avatarCropTitle: document.querySelector("#avatarCropTitle"),
  avatarCropStage: document.querySelector("#avatarCropStage"),
  avatarCropImage: document.querySelector("#avatarCropImage"),
  avatarCropZoom: document.querySelector("#avatarCropZoom"),
  avatarCropConfirm: document.querySelector("#avatarCropConfirm"),
  avatarCropCancel: document.querySelector("#avatarCropCancel"),
  avatarCropCancelSecondary: document.querySelector("#avatarCropCancelSecondary"),
  addVariantBtn: document.querySelector("#addVariantBtn"),
  deleteVariantBtn: document.querySelector("#deleteVariantBtn"),
  variantList: document.querySelector("#variantList"),
  coverDropzone: document.querySelector("#coverDropzone"),
  coverInput: document.querySelector("#coverInput"),
  coverImage: document.querySelector("#coverImage"),
  coverPlaceholder: document.querySelector("#coverPlaceholder"),
  clearCoverBtn: document.querySelector("#clearCoverBtn"),
  galleryInput: document.querySelector("#galleryInput"),
  galleryGrid: document.querySelector("#galleryGrid"),
  timelineEraInput: document.querySelector("#timelineEraInput"),
  timelineTitleInput: document.querySelector("#timelineTitleInput"),
  timelineTypeInput: document.querySelector("#timelineTypeInput"),
  timelineColorInput: document.querySelector("#timelineColorInput"),
  timelineDescriptionInput: document.querySelector("#timelineDescriptionInput"),
  timelineLinkList: document.querySelector("#timelineLinkList"),
  addTimelineBtn: document.querySelector("#addTimelineBtn"),
  cancelTimelineEditBtn: document.querySelector("#cancelTimelineEditBtn"),
  timelineList: document.querySelector("#timelineList"),
  illustrationInput: document.querySelector("#illustrationInput"),
  illustrationDropzone: document.querySelector("#illustrationDropzone"),
  illustrationGrid: document.querySelector("#illustrationGrid"),
  networkCanvas: document.querySelector("#networkCanvas"),
  networkZoomOutBtn: document.querySelector("#networkZoomOutBtn"),
  networkZoomInBtn: document.querySelector("#networkZoomInBtn"),
  networkResetViewBtn: document.querySelector("#networkResetViewBtn"),
  networkResetLayoutBtn: document.querySelector("#networkResetLayoutBtn"),
  networkAutoLayoutBtn: document.querySelector("#networkAutoLayoutBtn"),
  existingCharacterInput: document.querySelector("#existingCharacterInput"),
  addExistingCharacterNodeBtn: document.querySelector("#addExistingCharacterNodeBtn"),
  nodeNameInput: document.querySelector("#nodeNameInput"),
  nodeTypeInput: document.querySelector("#nodeTypeInput"),
  nodeColorInput: document.querySelector("#nodeColorInput"),
  nodeImageInput: document.querySelector("#nodeImageInput"),
  nodeImagePreview: document.querySelector("#nodeImagePreview"),
  clearNodeImageBtn: document.querySelector("#clearNodeImageBtn"),
  addNodeBtn: document.querySelector("#addNodeBtn"),
  edgeFromInput: document.querySelector("#edgeFromInput"),
  edgeToInput: document.querySelector("#edgeToInput"),
  edgeLabelInput: document.querySelector("#edgeLabelInput"),
  edgeReverseLabelInput: document.querySelector("#edgeReverseLabelInput"),
  edgeNoteInput: document.querySelector("#edgeNoteInput"),
  edgeColorInput: document.querySelector("#edgeColorInput"),
  edgeDirectionInput: document.querySelector("#edgeDirectionInput"),
  edgeLineStyleInput: document.querySelector("#edgeLineStyleInput"),
  addEdgeBtn: document.querySelector("#addEdgeBtn"),
  cancelNetworkEditBtn: document.querySelector("#cancelNetworkEditBtn"),
  relationshipList: document.querySelector("#relationshipList"),
  comicTitleInput: document.querySelector("#comicTitleInput"),
  comicSynopsisInput: document.querySelector("#comicSynopsisInput"),
  comicPagesInput: document.querySelector("#comicPagesInput"),
  comicDropzone: document.querySelector("#comicDropzone"),
  comicDraftPages: document.querySelector("#comicDraftPages"),
  addComicBtn: document.querySelector("#addComicBtn"),
  cancelComicEditBtn: document.querySelector("#cancelComicEditBtn"),
  comicList: document.querySelector("#comicList"),
  lightbox: document.querySelector("#lightbox"),
  lightboxImage: document.querySelector("#lightboxImage"),
  lightboxTitle: document.querySelector("#lightboxTitle"),
  lightboxDescription: document.querySelector("#lightboxDescription"),
  lightboxClose: document.querySelector("#lightboxClose"),
  lightboxPrev: document.querySelector("#lightboxPrev"),
  lightboxNext: document.querySelector("#lightboxNext"),
};

const inputByField = Object.fromEntries(
  [...characterFields, ...variantFields].map((field) => [
    field,
    document.querySelector(`#${field}Input`),
  ])
);

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function tx(storeMode = "readonly") {
  return state.db.transaction(STORE, storeMode).objectStore(STORE);
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function loadCharacters() {
  let all = await requestToPromise(tx().getAll());
  if (!all.length) {
    all = loadSnapshotCharacters();
  }
  state.characters = all.map(normalizeCharacter).sort((a, b) => b.updatedAt - a.updatedAt);
  state.activeId = state.characters[0]?.id ?? null;

  for (const character of state.characters) {
    await requestToPromise(tx("readwrite").put(character));
  }
  saveSnapshot();
  updatePersistedSnapshot();
  updateUndoButton();

  render();
}

function loadSnapshotCharacters() {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.characters) ? parsed.characters : [];
  } catch (error) {
    console.warn("读取本地快照失败", error);
    return [];
  }
}

function saveSnapshot() {
  try {
    localStorage.setItem(
      SNAPSHOT_KEY,
      JSON.stringify({
        app: "OC资料库",
        version: 4,
        savedAt: new Date().toISOString(),
        characters: state.characters,
      })
    );
  } catch (error) {
    console.warn("写入本地快照失败，可能是图片太多导致浏览器空间不足。", error);
  }
}

function serializeCharacters(characters = state.characters) {
  return JSON.stringify(characters);
}

function loadHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("读取撤销记录失败", error);
    return [];
  }
}

function saveHistory(history) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-HISTORY_LIMIT)));
  } catch (error) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-2)));
    } catch (innerError) {
      console.warn("写入撤销记录失败，可能是图片太多导致浏览器空间不足。", innerError);
    }
  }
  updateUndoButton();
}

function recordHistoryBeforeSave(nextCharacters = state.characters) {
  if (state.restoringHistory) return;
  const previous = state.lastPersistedSnapshot;
  const next = serializeCharacters(nextCharacters);
  if (!previous || previous === next) return;
  const history = loadHistory();
  if (history.at(-1)?.snapshot !== previous) {
    history.push({ savedAt: new Date().toISOString(), snapshot: previous });
  }
  saveHistory(history);
}

function updatePersistedSnapshot() {
  state.lastPersistedSnapshot = serializeCharacters();
}

function updateUndoButton() {
  if (!els.undoBtn) return;
  els.undoBtn.disabled = !loadHistory().length;
}

function createVariant(overrides = {}) {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    variantName: "",
    world: "",
    summary: "",
    age: "",
    species: "",
    pronouns: "",
    role: "",
    personality: "",
    appearance: "",
    backstory: "",
    detailedStory: "",
    relationships: "",
    notes: "",
    cover: "",
    images: [],
    timeline: [],
    comics: [],
    illustrations: [],
    relationshipsNetwork: createNetworkData(),
    ...overrides,
  };
}

function normalizeImage(image) {
  return {
    id: image.id || crypto.randomUUID(),
    name: image.name || "",
    dataUrl: image.dataUrl || "",
    caption: image.caption || "",
    createdAt: image.createdAt || Date.now(),
  };
}

function normalizeTimelineEvent(event) {
  return {
    id: event.id || crypto.randomUUID(),
    era: event.era || event.time || "",
    title: event.title || "",
    type: event.type || "",
    description: event.description || event.note || "",
    color: event.color || "#167c80",
    links: normalizeTimelineLinks(event.links),
    createdAt: event.createdAt || Date.now(),
    updatedAt: event.updatedAt || event.createdAt || Date.now(),
  };
}

function normalizeTimelineLinks(links) {
  if (!Array.isArray(links)) return [];
  const seen = new Set();
  return links
    .map((link) => ({
      type: link.type === "comic" ? "comic" : link.type === "illustration" ? "illustration" : "",
      id: link.id || "",
    }))
    .filter((link) => {
      const key = `${link.type}:${link.id}`;
      if (!link.type || !link.id || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normalizeComic(comic) {
  return {
    id: comic.id || crypto.randomUUID(),
    title: comic.title || "",
    synopsis: comic.synopsis || "",
    pages: Array.isArray(comic.pages) ? comic.pages.map(normalizeImage) : [],
    createdAt: comic.createdAt || Date.now(),
  };
}

function createNetworkData(overrides = {}) {
  const { view, ...rest } = overrides;
  return {
    nodes: [],
    edges: [],
    ...rest,
    view: normalizeNetworkView(view),
  };
}

function normalizeNetworkView(view = {}) {
  return {
    scale: clamp(Number(view.scale) || 1, 0.55, 2.4),
    panX: Number.isFinite(Number(view.panX)) ? Number(view.panX) : 0,
    panY: Number.isFinite(Number(view.panY)) ? Number(view.panY) : 0,
  };
}

function normalizeNetworkNode(node, fallbackName = "") {
  return {
    id: node.id || crypto.randomUUID(),
    linkedCharacterId: node.linkedCharacterId || "",
    name: node.name || fallbackName || "未命名节点",
    type: node.type || "",
    color: node.color || (node.isSelf ? "#167c80" : "#b23a62"),
    image: node.image || "",
    x: Number.isFinite(Number(node.x)) ? Number(node.x) : null,
    y: Number.isFinite(Number(node.y)) ? Number(node.y) : null,
    isSelf: Boolean(node.isSelf),
    createdAt: node.createdAt || Date.now(),
    updatedAt: node.updatedAt || node.createdAt || Date.now(),
  };
}

function normalizeNetworkEdge(edge) {
  return {
    id: edge.id || crypto.randomUUID(),
    from: edge.from || edge.fromId || "",
    to: edge.to || edge.toId || "",
    label: edge.label || edge.type || "",
    reverseLabel: edge.reverseLabel || "",
    note: edge.note || "",
    color: edge.color || "#9aabba",
    direction: ["none", "forward", "backward", "both"].includes(edge.direction) ? edge.direction : "forward",
    lineStyle: edge.lineStyle === "dashed" ? "dashed" : "solid",
    createdAt: edge.createdAt || Date.now(),
    updatedAt: edge.updatedAt || edge.createdAt || Date.now(),
  };
}

function networkFromSimpleRelations(relations, characterName = "") {
  const selfId = crypto.randomUUID();
  const nodes = [
    normalizeNetworkNode({ id: selfId, name: characterName || "当前OC", type: "当前OC", color: "#167c80", isSelf: true }),
  ];
  const edges = [];

  for (const relation of relations) {
    const nodeId = crypto.randomUUID();
    nodes.push(
      normalizeNetworkNode({
        id: nodeId,
        name: relation.name || "未命名",
        type: relation.type || "",
        color: relation.color || "#b23a62",
        createdAt: relation.createdAt,
      })
    );
    edges.push(
      normalizeNetworkEdge({
        id: relation.id,
        from: selfId,
        to: nodeId,
        label: relation.type || "关系",
        note: relation.note || "",
        color: relation.color || "#9aabba",
        createdAt: relation.createdAt,
      })
    );
  }

  return createNetworkData({ nodes, edges, view: normalizeNetworkView() });
}

function normalizeNetworkData(network, characterName = "") {
  if (Array.isArray(network)) {
    return networkFromSimpleRelations(network, characterName);
  }

  const normalized = createNetworkData({
    view: normalizeNetworkView(network?.view),
    nodes: Array.isArray(network?.nodes) ? network.nodes.map((node) => normalizeNetworkNode(node)) : [],
    edges: Array.isArray(network?.edges) ? network.edges.map(normalizeNetworkEdge) : [],
  });

  if (!normalized.nodes.some((node) => node.isSelf)) {
    normalized.nodes.unshift(
      normalizeNetworkNode({ name: characterName || "当前OC", type: "当前OC", color: "#167c80", isSelf: true })
    );
  }

  const validIds = new Set(normalized.nodes.map((node) => node.id));
  normalized.edges = normalized.edges.filter(
    (edge) => validIds.has(edge.from) && validIds.has(edge.to) && edge.from !== edge.to
  );

  return normalized;
}

function createCharacter() {
  const now = Date.now();
  const variant = createVariant({ variantName: "主线" });
  return {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    name: "",
    status: "draft",
    tags: "",
    avatar: "",
    relationshipsNetwork: [],
    activeVariantId: variant.id,
    variants: [variant],
  };
}

function normalizeCharacter(character) {
  const legacyNetwork = Array.isArray(character.relationshipsNetwork)
    ? character.relationshipsNetwork
    : [];
  const base = {
    ...createCharacter(),
    ...character,
    id: character.id || crypto.randomUUID(),
    status: character.status || "draft",
    tags: character.tags || "",
    avatar: character.avatar || "",
    relationshipsNetwork: legacyNetwork,
    updatedAt: character.updatedAt || Date.now(),
  };

  if (!Array.isArray(character.variants) || !character.variants.length) {
    const migratedVariant = createVariant({
      variantName: character.world ? "主线" : "默认分支",
      world: character.world || "",
      summary: character.summary || "",
      age: character.age || "",
      species: character.species || "",
      pronouns: character.pronouns || "",
      role: character.role || "",
      personality: character.personality || "",
      appearance: character.appearance || "",
      backstory: character.backstory || "",
      detailedStory: character.detailedStory || "",
      relationships: character.relationships || "",
      notes: character.notes || "",
      cover: character.cover || "",
      images: Array.isArray(character.images) ? character.images.map(normalizeImage) : [],
      timeline: Array.isArray(character.timeline) ? character.timeline.map(normalizeTimelineEvent) : [],
      comics: Array.isArray(character.comics) ? character.comics.map(normalizeComic) : [],
      illustrations: Array.isArray(character.illustrations)
        ? character.illustrations.map(normalizeImage)
        : [],
      relationshipsNetwork: normalizeNetworkData(character.relationshipsNetwork || legacyNetwork, character.name || ""),
      createdAt: character.createdAt || Date.now(),
      updatedAt: character.updatedAt || Date.now(),
    });
    base.variants = [migratedVariant];
    base.activeVariantId = migratedVariant.id;
  } else {
    base.variants = character.variants.map((variant) =>
      createVariant({
        ...variant,
        id: variant.id || crypto.randomUUID(),
        images: Array.isArray(variant.images) ? variant.images.map(normalizeImage) : [],
        timeline: Array.isArray(variant.timeline) ? variant.timeline.map(normalizeTimelineEvent) : [],
        comics: Array.isArray(variant.comics) ? variant.comics.map(normalizeComic) : [],
        illustrations: Array.isArray(variant.illustrations) ? variant.illustrations.map(normalizeImage) : [],
        relationshipsNetwork: normalizeNetworkData(
          variant.relationshipsNetwork || legacyNetwork,
          character.name || ""
        ),
      })
    );
    if (!base.variants.some((variant) => variant.id === character.activeVariantId)) {
      base.activeVariantId = base.variants[0].id;
    }
  }

  return base;
}

async function addCharacter() {
  const character = createCharacter();
  state.characters.unshift(character);
  state.activeId = character.id;
  await saveCharacter(character, true);
  render();
  inputByField.name.focus();
}

function getActiveCharacter() {
  return state.characters.find((character) => character.id === state.activeId) ?? null;
}

function getActiveVariant(character = getActiveCharacter()) {
  if (!character) return null;
  return (
    character.variants.find((variant) => variant.id === character.activeVariantId) ??
    character.variants[0] ??
    null
  );
}

async function saveCharacter(character, immediate = false) {
  character.updatedAt = Date.now();
  const activeVariant = getActiveVariant(character);
  if (activeVariant) activeVariant.updatedAt = Date.now();

  if (immediate) {
    recordHistoryBeforeSave();
    await requestToPromise(tx("readwrite").put(character));
    state.characters = state.characters
      .map((item) => (item.id === character.id ? character : item))
      .sort((a, b) => b.updatedAt - a.updatedAt);
    saveSnapshot();
    updatePersistedSnapshot();
    setSaveState("已保存");
    return;
  }

  setSaveState("保存中...");
  clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(async () => {
    recordHistoryBeforeSave();
    await requestToPromise(tx("readwrite").put(character));
    state.characters = state.characters
      .map((item) => (item.id === character.id ? character : item))
      .sort((a, b) => b.updatedAt - a.updatedAt);
    saveSnapshot();
    updatePersistedSnapshot();
    setSaveState("已保存");
    renderList();
    renderVariants(character);
  }, 350);
}

function setSaveState(text) {
  els.saveState.textContent = text;
}

function render() {
  const active = getActiveCharacter();
  els.emptyState.classList.toggle("hidden", Boolean(active));
  els.editor.classList.toggle("hidden", !active);
  renderList();

  if (!active) return;
  renderEditor(active);
}

function renderList() {
  const template = document.querySelector("#characterCardTemplate");
  const query = state.query.trim().toLowerCase();
  const filtered = state.characters.filter((character) => {
    const statusMatch = state.filter === "all" || character.status === state.filter;
    const variantText = character.variants
      .map((variant) =>
        [
          variant.variantName,
          variant.world,
          variant.summary,
          variant.role,
          variant.backstory,
          variant.detailedStory,
          variant.relationships,
        ].join(" ")
      )
      .join(" ");
    const relationText = character.variants
      .map((variant) => {
        const network = normalizeNetworkData(variant.relationshipsNetwork, character.name || "");
        const nodes = network.nodes.map((node) => [node.name, node.type].join(" ")).join(" ");
        const edges = network.edges.map((edge) => [edge.label, edge.note].join(" ")).join(" ");
        return `${nodes} ${edges}`;
      })
      .join(" ");
    const haystack = [character.name, character.tags, variantText, relationText].join(" ").toLowerCase();
    return statusMatch && (!query || haystack.includes(query));
  });

  els.characterList.replaceChildren();

  if (!filtered.length) {
    const empty = document.createElement("p");
    empty.className = "muted-list-note";
    empty.textContent = state.characters.length ? "没有匹配的OC。" : "还没有OC。";
    els.characterList.append(empty);
    return;
  }

  for (const character of filtered) {
    const node = template.content.firstElementChild.cloneNode(true);
    const thumb = node.querySelector(".thumb");
    const title = node.querySelector("strong");
    const meta = node.querySelector("small");
    const variant = getActiveVariant(character);

    node.classList.toggle("active", character.id === state.activeId);
    title.textContent = character.name || "未命名OC";
    meta.textContent = [
      statusLabel(character.status),
      `${character.variants.length}个分支`,
      variant?.world,
      character.tags,
    ]
      .filter(Boolean)
      .join(" / ");
    const avatar = character.avatar || variant?.cover;
    if (avatar) {
      thumb.style.backgroundImage = `url("${avatar}")`;
    }
    node.addEventListener("click", () => {
      state.activeId = character.id;
      render();
    });

    els.characterList.append(node);
  }
}

function statusLabel(status) {
  return {
    draft: "🌟",
    active: "🌟🌟",
    archived: "🌟🌟🌟",
  }[status] ?? "🌟";
}

function renderEditor(character) {
  const variant = getActiveVariant(character);
  if (!variant) return;

  for (const field of characterFields) {
    inputByField[field].value = character[field] ?? "";
  }
  for (const field of variantFields) {
    inputByField[field].value = variant[field] ?? "";
  }

  renderVariants(character);
  renderAvatar(character);
  renderCover(variant);
  renderGallery(character, variant);
  renderIllustrations(character, variant);
  const editingTimeline = variant.timeline.find((event) => event.id === state.editingTimelineId);
  renderTimelineLinkOptions(variant, editingTimeline?.links || []);
  if (state.editingTimelineId && !variant.timeline.some((event) => event.id === state.editingTimelineId)) {
    clearTimelineForm();
  }
  renderTimeline(character, variant);
  if (state.editingComicId && !variant.comics.some((comic) => comic.id === state.editingComicId)) {
    clearComicForm();
  }
  renderComicDraftPages();
  renderComics(character, variant);
  const network = getVariantNetwork(character, variant);
  const editingStillExists = state.editingNetworkItemType === "node"
    ? network.nodes.some((node) => node.id === state.editingNetworkItemId)
    : network.edges.some((edge) => edge.id === state.editingNetworkItemId);
  if (state.editingNetworkItemId && !editingStillExists) {
    clearNetworkForms();
  }
  renderRelationshipNetwork(character, variant);
  setSaveState("已保存");
}

function renderAvatar(character) {
  const hasAvatar = Boolean(character.avatar);
  els.avatarImage.classList.toggle("hidden", !hasAvatar);
  els.avatarPlaceholder.classList.toggle("hidden", hasAvatar);
  if (hasAvatar) {
    els.avatarImage.src = character.avatar;
  } else {
    els.avatarImage.removeAttribute("src");
  }
}

function renderVariants(character) {
  els.variantList.replaceChildren();

  for (const variant of character.variants) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "variant-chip";
    button.classList.toggle("active", variant.id === character.activeVariantId);
    button.textContent = variant.variantName || variant.world || "未命名分支";
    button.addEventListener("click", async () => {
      character.activeVariantId = variant.id;
      clearTimelineForm();
      clearNetworkForms();
      await saveCharacter(character, true);
      renderEditor(character);
      renderList();
    });
    els.variantList.append(button);
  }

  els.deleteVariantBtn.disabled = character.variants.length <= 1;
}

function renderCover(variant) {
  const hasCover = Boolean(variant.cover);
  els.coverDropzone.classList.toggle("has-cover", hasCover);
  els.coverImage.classList.toggle("hidden", !hasCover);
  els.coverPlaceholder.classList.toggle("hidden", hasCover);
  if (hasCover) {
    els.coverImage.src = variant.cover;
    applyResponsiveCoverFrame(els.coverDropzone, variant.cover);
  } else {
    els.coverImage.removeAttribute("src");
    resetResponsiveCoverFrame(els.coverDropzone);
  }
}

function resetResponsiveCoverFrame(element) {
  delete element.dataset.coverSrc;
  element.style.removeProperty("--cover-aspect");
  element.style.removeProperty("--cover-width");
}

function applyResponsiveCoverFrame(element, src) {
  element.dataset.coverSrc = src;
  const img = new Image();
  img.onload = () => {
    if (element.dataset.coverSrc !== src) return;
    if (!img.naturalWidth || !img.naturalHeight) return;
    const ratio = img.naturalWidth / img.naturalHeight;
    element.style.setProperty("--cover-aspect", `${img.naturalWidth} / ${img.naturalHeight}`);
    element.style.setProperty(
      "--cover-width",
      ratio < 0.78 ? `min(100%, ${Math.round(ratio * 560)}px)` : "100%"
    );
  };
  img.src = src;
}

function renderGallery(character, variant) {
  const template = document.querySelector("#galleryItemTemplate");
  els.galleryGrid.replaceChildren();

  if (!variant.images.length) {
    const empty = document.createElement("p");
    empty.className = "muted-list-note";
    empty.textContent = "当前分支还没有图库图片。";
    els.galleryGrid.append(empty);
    return;
  }

  const lightboxItems = variant.images.map((image) => ({
    src: image.dataUrl,
    title: image.name || "图库图片",
    description: image.caption || "",
  }));

  variant.images.forEach((image, index) => {
    const node = template.content.firstElementChild.cloneNode(true);
    const img = node.querySelector("img");
    const captionInput = node.querySelector(".image-caption-input");

    img.src = image.dataUrl;
    img.alt = image.caption || image.name || "图库图片";
    captionInput.value = image.caption || "";

    node.querySelector(".image-preview").addEventListener("click", () => {
      openLightbox({
        src: image.dataUrl,
        title: image.name || "图库图片",
        description: image.caption || "",
        items: lightboxItems,
        index,
      });
    });

    captionInput.addEventListener("input", () => {
      image.caption = captionInput.value;
      saveCharacter(character);
    });

    node.querySelector(".set-cover").addEventListener("click", async () => {
      variant.cover = image.dataUrl;
      await saveCharacter(character, true);
      renderEditor(character);
      renderList();
    });
    node.querySelector(".remove-image").addEventListener("click", async () => {
      variant.images = variant.images.filter((item) => item.id !== image.id);
      if (variant.cover === image.dataUrl) {
        variant.cover = "";
      }
      await saveCharacter(character, true);
      renderEditor(character);
      renderList();
    });
    els.galleryGrid.append(node);
  });
}

function renderIllustrations(character, variant) {
  const template = document.querySelector("#galleryItemTemplate");
  els.illustrationGrid.replaceChildren();

  if (!variant.illustrations.length) {
    const empty = document.createElement("p");
    empty.className = "muted-list-note";
    empty.textContent = "当前分支还没有插图。";
    els.illustrationGrid.append(empty);
    return;
  }

  const lightboxItems = variant.illustrations.map((image) => ({
    src: image.dataUrl,
    title: image.name || "插图",
    description: image.caption || "",
  }));

  variant.illustrations.forEach((image, index) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.dataset.linkedType = "illustration";
    node.dataset.linkedId = image.id;
    const img = node.querySelector("img");
    const captionInput = node.querySelector(".image-caption-input");

    img.src = image.dataUrl;
    img.alt = image.caption || image.name || "插图";
    captionInput.value = image.caption || "";

    node.querySelector(".image-preview").addEventListener("click", () => {
      openLightbox({
        src: image.dataUrl,
        title: image.name || "插图",
        description: image.caption || "",
        items: lightboxItems,
        index,
      });
    });

    captionInput.addEventListener("input", () => {
      image.caption = captionInput.value;
      saveCharacter(character);
    });

    const linkedEvents = getLinkedTimelineEvents(variant, "illustration", image.id);
    const linkedRow = createBacklinkRow(linkedEvents, "对应时间轴");
    if (linkedRow) node.append(linkedRow);

    node.querySelector(".set-cover").addEventListener("click", async () => {
      variant.cover = image.dataUrl;
      await saveCharacter(character, true);
      renderEditor(character);
      renderList();
    });
    node.querySelector(".remove-image").addEventListener("click", async () => {
      variant.illustrations = variant.illustrations.filter((item) => item.id !== image.id);
      pruneTimelineLinks(variant);
      if (variant.cover === image.dataUrl) {
        variant.cover = "";
      }
      await saveCharacter(character, true);
      renderEditor(character);
      renderList();
    });
    els.illustrationGrid.append(node);
  });
}

function timelineLinkKey(link) {
  return `${link.type}:${link.id}`;
}

function getTimelineLinkOptions(variant) {
  const illustrationOptions = variant.illustrations.map((image, index) => ({
    type: "illustration",
    id: image.id,
    label: image.caption || image.name || `插图 ${index + 1}`,
  }));
  const comicOptions = variant.comics.map((comic, index) => ({
    type: "comic",
    id: comic.id,
    label: comic.title || `漫画 ${index + 1}`,
  }));
  return [...illustrationOptions, ...comicOptions];
}

function findTimelineLinkedContent(variant, link) {
  if (link.type === "comic") {
    const comic = variant.comics.find((item) => item.id === link.id);
    return comic ? { ...link, label: comic.title || "未命名漫画" } : null;
  }
  if (link.type === "illustration") {
    const index = variant.illustrations.findIndex((item) => item.id === link.id);
    const image = variant.illustrations[index];
    return image ? { ...link, label: image.caption || image.name || `插图 ${index + 1}` } : null;
  }
  return null;
}

function renderTimelineLinkOptions(variant, selectedLinks = []) {
  els.timelineLinkList.replaceChildren();
  const options = getTimelineLinkOptions(variant);
  if (!options.length) {
    const empty = document.createElement("p");
    empty.className = "link-empty-note";
    empty.textContent = "先添加插图或漫画后，可以在这里关联。";
    els.timelineLinkList.append(empty);
    return;
  }

  const selected = new Set(normalizeTimelineLinks(selectedLinks).map(timelineLinkKey));
  for (const option of options) {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = timelineLinkKey(option);
    input.dataset.linkType = option.type;
    input.dataset.linkId = option.id;
    input.checked = selected.has(timelineLinkKey(option));
    const text = document.createElement("span");
    text.textContent = `${option.type === "comic" ? "漫画" : "插图"}：${option.label}`;
    label.append(input, text);
    els.timelineLinkList.append(label);
  }
}

function getTimelineLinksFromForm() {
  return [...els.timelineLinkList.querySelectorAll("input:checked")].map((input) => ({
    type: input.dataset.linkType,
    id: input.dataset.linkId,
  }));
}

function pruneTimelineLinks(variant) {
  const valid = new Set(getTimelineLinkOptions(variant).map(timelineLinkKey));
  for (const event of variant.timeline) {
    event.links = normalizeTimelineLinks(event.links).filter((link) => valid.has(timelineLinkKey(link)));
  }
}

function getLinkedTimelineEvents(variant, type, id) {
  return variant.timeline.filter((event) =>
    normalizeTimelineLinks(event.links).some((link) => link.type === type && link.id === id)
  );
}

function createLinkChip(text, onClick) {
  const chip = document.createElement("button");
  chip.className = "link-chip";
  chip.type = "button";
  chip.textContent = text;
  chip.addEventListener("click", (event) => {
    event.stopPropagation();
    onClick();
  });
  return chip;
}

function createBacklinkRow(events, prefix) {
  if (!events.length) return null;
  const row = document.createElement("div");
  row.className = "linked-content-row";
  for (const event of events) {
    row.append(createLinkChip(`${prefix}：${event.title || event.era || "未命名事件"}`, () => jumpToTimelineEvent(event.id)));
  }
  return row;
}

function jumpToLinkedContent(type, id) {
  highlightElement(document.querySelector(`[data-linked-type="${type}"][data-linked-id="${id}"]`));
}

function jumpToTimelineEvent(id) {
  highlightElement(document.querySelector(`[data-event-id="${id}"]`));
}

function highlightElement(element) {
  if (!element) return;
  element.scrollIntoView({ behavior: "smooth", block: "center" });
  element.classList.add("jump-highlight");
  window.setTimeout(() => element.classList.remove("jump-highlight"), 1400);
}

function renderTimeline(character, variant) {
  els.timelineList.replaceChildren();

  if (!variant.timeline.length) {
    const empty = document.createElement("p");
    empty.className = "muted-list-note";
    empty.textContent = "当前分支还没有时间轴事件。";
    els.timelineList.append(empty);
    return;
  }

  variant.timeline.forEach((event) => {
    const item = document.createElement("article");
    item.className = "timeline-item";
    item.draggable = true;
    item.dataset.eventId = event.id;
    item.classList.toggle("editing", event.id === state.editingTimelineId);
    item.style.setProperty("--event-color", event.color || "#167c80");

    const marker = document.createElement("span");
    marker.className = "timeline-marker";

    const body = document.createElement("div");
    body.className = "timeline-body";
    body.title = "编辑时间轴事件";

    const meta = document.createElement("div");
    meta.className = "timeline-meta";
    const era = document.createElement("span");
    era.textContent = event.era || "未定时间";
    const type = document.createElement("small");
    type.textContent = event.type || "事件";
    meta.append(era, type);

    const title = document.createElement("strong");
    title.textContent = event.title || "未命名事件";
    const description = document.createElement("p");
    description.textContent = event.description || "没有事件说明。";
    body.append(meta, title, description);
    const linkedRow = document.createElement("div");
    linkedRow.className = "linked-content-row";
    normalizeTimelineLinks(event.links)
      .map((link) => findTimelineLinkedContent(variant, link))
      .filter(Boolean)
      .forEach((link) => {
        linkedRow.append(
          createLinkChip(`${link.type === "comic" ? "漫画" : "插图"}：${link.label}`, () =>
            jumpToLinkedContent(link.type, link.id)
          )
        );
      });
    if (linkedRow.children.length) body.append(linkedRow);
    body.addEventListener("click", () => startTimelineEdit(event));

    const remove = createMiniDeleteButton("删除事件");
    remove.addEventListener("click", async () => {
      if (!confirm(`确定删除「${event.title || "未命名事件"}」吗？`)) return;
      variant.timeline = variant.timeline.filter((itemEvent) => itemEvent.id !== event.id);
      if (state.editingTimelineId === event.id) clearTimelineForm();
      await saveCharacter(character, true);
      renderTimeline(character, variant);
    });

    item.addEventListener("dragstart", (dragEvent) => {
      state.draggedTimelineId = event.id;
      item.classList.add("dragging");
      dragEvent.dataTransfer.effectAllowed = "move";
    });
    item.addEventListener("dragend", () => {
      state.draggedTimelineId = null;
      item.classList.remove("dragging");
    });
    item.addEventListener("dragover", (dragEvent) => {
      dragEvent.preventDefault();
      item.classList.add("drag-over");
    });
    item.addEventListener("dragleave", () => item.classList.remove("drag-over"));
    item.addEventListener("drop", async (dragEvent) => {
      dragEvent.preventDefault();
      item.classList.remove("drag-over");
      await reorderTimelineEvent(character, variant, state.draggedTimelineId, event.id);
    });

    item.append(marker, body, remove);
    els.timelineList.append(item);
  });
}

async function reorderTimelineEvent(character, variant, sourceId, targetId) {
  if (!sourceId || !targetId || sourceId === targetId) return;
  const sourceIndex = variant.timeline.findIndex((event) => event.id === sourceId);
  const targetIndex = variant.timeline.findIndex((event) => event.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0) return;
  const [event] = variant.timeline.splice(sourceIndex, 1);
  variant.timeline.splice(targetIndex, 0, event);
  await saveCharacter(character, true);
  renderTimeline(character, variant);
}

function startTimelineEdit(event) {
  const variant = getActiveVariant();
  state.editingTimelineId = event.id;
  els.timelineEraInput.value = event.era || "";
  els.timelineTitleInput.value = event.title || "";
  els.timelineTypeInput.value = event.type || "";
  els.timelineColorInput.value = event.color || "#167c80";
  els.timelineDescriptionInput.value = event.description || "";
  renderTimelineLinkOptions(variant, event.links || []);
  els.addTimelineBtn.textContent = "保存事件";
  renderTimeline(getActiveCharacter(), getActiveVariant());
  els.timelineTitleInput.focus();
}

function clearTimelineForm() {
  state.editingTimelineId = null;
  els.timelineEraInput.value = "";
  els.timelineTitleInput.value = "";
  els.timelineTypeInput.value = "";
  els.timelineColorInput.value = "#167c80";
  els.timelineDescriptionInput.value = "";
  const variant = getActiveVariant();
  if (variant) renderTimelineLinkOptions(variant);
  els.addTimelineBtn.textContent = "添加事件";
}

async function addTimelineEvent() {
  const character = getActiveCharacter();
  const variant = getActiveVariant(character);
  if (!character || !variant) return;

  const era = els.timelineEraInput.value.trim();
  const title = els.timelineTitleInput.value.trim();
  const type = els.timelineTypeInput.value.trim();
  const color = els.timelineColorInput.value || "#167c80";
  const description = els.timelineDescriptionInput.value.trim();
  const links = normalizeTimelineLinks(getTimelineLinksFromForm());
  if (!era && !title && !type && !description && !links.length) return;

  const existing = variant.timeline.find((event) => event.id === state.editingTimelineId);
  if (existing) {
    existing.era = era;
    existing.title = title;
    existing.type = type;
    existing.color = color;
    existing.description = description;
    existing.links = links;
    existing.updatedAt = Date.now();
  } else {
    variant.timeline.push(
      normalizeTimelineEvent({
        era,
        title,
        type,
        color,
        description,
        links,
        createdAt: Date.now(),
      })
    );
  }

  clearTimelineForm();
  await saveCharacter(character, true);
  renderTimeline(character, variant);
}

function renderComics(character, variant) {
  els.comicList.replaceChildren();

  if (!variant.comics.length) {
    const empty = document.createElement("p");
    empty.className = "muted-list-note";
    empty.textContent = "还没有漫画。";
    els.comicList.append(empty);
    return;
  }

  for (const comic of variant.comics) {
    const article = document.createElement("article");
    article.className = "comic-card";
    article.dataset.linkedType = "comic";
    article.dataset.linkedId = comic.id;
    article.classList.toggle("editing", comic.id === state.editingComicId);

    const header = document.createElement("div");
    header.className = "comic-card-header";
    const title = document.createElement("button");
    title.className = "comic-title";
    title.type = "button";
    title.title = "编辑漫画";
    const strong = document.createElement("strong");
    strong.textContent = comic.title || "未命名漫画";
    const small = document.createElement("small");
    small.textContent = `${comic.pages.length} 页 / 点击编辑`;
    title.append(strong, small);
    title.addEventListener("click", () => startComicEdit(comic));

    const remove = document.createElement("button");
    remove.className = "icon-button mini danger";
    remove.type = "button";
    remove.title = "删除漫画";
    remove.setAttribute("aria-label", "删除漫画");
    remove.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 11v6m4-6v6M9 7V4h6v3m-8 0 1 14h8l1-14"/></svg>';
    remove.addEventListener("click", async () => {
      if (!confirm(`确定删除「${comic.title || "未命名漫画"}」吗？`)) return;
      variant.comics = variant.comics.filter((item) => item.id !== comic.id);
      pruneTimelineLinks(variant);
      if (state.editingComicId === comic.id) {
        clearComicForm();
      }
      await saveCharacter(character, true);
      renderTimelineLinkOptions(variant);
      renderTimeline(character, variant);
      renderComics(character, variant);
    });
    header.append(title, remove);

    const synopsis = document.createElement("p");
    synopsis.className = "comic-synopsis";
    synopsis.textContent = comic.synopsis || "没有剧情简介。";

    const linkedEvents = getLinkedTimelineEvents(variant, "comic", comic.id);
    const linkedRow = createBacklinkRow(linkedEvents, "对应时间轴");

    const pages = document.createElement("div");
    pages.className = "comic-pages";
    const lightboxItems = comic.pages.map((page, index) => ({
      src: page.dataUrl,
      title: `${comic.title || "未命名漫画"} - 第 ${index + 1} 页`,
      description: comic.synopsis || "",
    }));
    comic.pages.forEach((page, index) => {
      pages.append(createComicPageButton(page, index, comic, lightboxItems));
    });

    article.append(header, synopsis);
    if (linkedRow) article.append(linkedRow);
    article.append(pages);
    els.comicList.append(article);
  }
}

function createComicPageButton(page, index, comic, lightboxItems = null) {
  const button = document.createElement("button");
  button.className = "comic-page";
  button.type = "button";
  button.title = "大图浏览";
  const img = document.createElement("img");
  img.src = page.dataUrl;
  img.alt = page.name || `第 ${index + 1} 页`;
  const badge = document.createElement("span");
  badge.textContent = index + 1;
  button.append(img, badge);
  button.addEventListener("click", () => {
    openLightbox({
      src: page.dataUrl,
      title: `${comic.title || "未命名漫画"} - 第 ${index + 1} 页`,
      description: comic.synopsis || "",
      items:
        lightboxItems ??
        comic.pages?.map((item, itemIndex) => ({
          src: item.dataUrl,
          title: `${comic.title || "未命名漫画"} - 第 ${itemIndex + 1} 页`,
          description: comic.synopsis || "",
        })),
      index,
    });
  });
  return button;
}

function startComicEdit(comic) {
  state.editingComicId = comic.id;
  state.comicDraftPages = comic.pages.map((page) => ({ ...page }));
  els.comicTitleInput.value = comic.title || "";
  els.comicSynopsisInput.value = comic.synopsis || "";
  els.addComicBtn.textContent = "保存漫画";
  renderComicDraftPages();
  renderComics(getActiveCharacter(), getActiveVariant());
  els.comicTitleInput.focus();
}

function clearComicForm() {
  state.editingComicId = null;
  state.comicDraftPages = [];
  state.draggedComicPageId = null;
  els.comicTitleInput.value = "";
  els.comicSynopsisInput.value = "";
  els.comicPagesInput.value = "";
  els.addComicBtn.textContent = "添加漫画";
  renderComicDraftPages();
}

function renderComicDraftPages() {
  els.comicDraftPages.replaceChildren();

  if (!state.comicDraftPages.length) {
    const empty = document.createElement("p");
    empty.className = "muted-list-note";
    empty.textContent = "还没有选择漫画图片。";
    els.comicDraftPages.append(empty);
    return;
  }

  const draftLightboxItems = state.comicDraftPages.map((page, index) => ({
    src: page.dataUrl,
    title: `${els.comicTitleInput.value || "正在编辑的漫画"} - 第 ${index + 1} 页`,
    description: els.comicSynopsisInput.value || "",
  }));

  state.comicDraftPages.forEach((page, index) => {
    const item = document.createElement("article");
    item.className = "comic-draft-page";
    item.draggable = true;
    item.dataset.pageId = page.id;

    const preview = createComicPageButton(page, index, {
      title: els.comicTitleInput.value || "正在编辑的漫画",
      synopsis: els.comicSynopsisInput.value || "",
    }, draftLightboxItems);

    const footer = document.createElement("div");
    footer.className = "comic-draft-footer";
    const name = document.createElement("span");
    name.textContent = page.name || `第 ${index + 1} 页`;
    const remove = document.createElement("button");
    remove.className = "icon-button mini danger";
    remove.type = "button";
    remove.title = "移除这一页";
    remove.setAttribute("aria-label", "移除这一页");
    remove.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 11v6m4-6v6M9 7V4h6v3m-8 0 1 14h8l1-14"/></svg>';
    remove.addEventListener("click", () => {
      state.comicDraftPages = state.comicDraftPages.filter((draftPage) => draftPage.id !== page.id);
      renderComicDraftPages();
    });
    footer.append(name, remove);

    item.addEventListener("dragstart", (event) => {
      state.draggedComicPageId = page.id;
      item.classList.add("dragging");
      event.dataTransfer.effectAllowed = "move";
    });
    item.addEventListener("dragend", () => {
      state.draggedComicPageId = null;
      item.classList.remove("dragging");
    });
    item.addEventListener("dragover", (event) => {
      event.preventDefault();
      item.classList.add("drag-over");
    });
    item.addEventListener("dragleave", () => item.classList.remove("drag-over"));
    item.addEventListener("drop", (event) => {
      event.preventDefault();
      item.classList.remove("drag-over");
      reorderComicDraftPage(state.draggedComicPageId, page.id);
    });

    item.append(preview, footer);
    els.comicDraftPages.append(item);
  });
}

function reorderComicDraftPage(sourceId, targetId) {
  if (!sourceId || !targetId || sourceId === targetId) return;
  const sourceIndex = state.comicDraftPages.findIndex((page) => page.id === sourceId);
  const targetIndex = state.comicDraftPages.findIndex((page) => page.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0) return;
  const [page] = state.comicDraftPages.splice(sourceIndex, 1);
  state.comicDraftPages.splice(targetIndex, 0, page);
  renderComicDraftPages();
}

async function addComicFiles(files) {
  const imageFiles = [...files].filter((file) => file.type.startsWith("image/"));
  if (!imageFiles.length) return;

  setSaveState("处理漫画图片...");
  for (const file of imageFiles) {
    state.comicDraftPages.push({
      id: crypto.randomUUID(),
      name: file.name,
      dataUrl: await resizeImage(file),
      caption: "",
      createdAt: Date.now(),
    });
  }
  els.comicPagesInput.value = "";
  renderComicDraftPages();
  setSaveState("已保存");
}

function setLightboxImage(index) {
  if (!state.lightboxItems.length) return;
  state.lightboxIndex = (index + state.lightboxItems.length) % state.lightboxItems.length;
  const item = state.lightboxItems[state.lightboxIndex];
  els.lightboxImage.src = item.src;
  els.lightboxTitle.textContent =
    state.lightboxItems.length > 1
      ? `${item.title || "图片"} (${state.lightboxIndex + 1}/${state.lightboxItems.length})`
      : item.title || "图片";
  els.lightboxDescription.textContent = item.description || "";
  const hasMultiple = state.lightboxItems.length > 1;
  els.lightboxPrev.classList.toggle("hidden", !hasMultiple);
  els.lightboxNext.classList.toggle("hidden", !hasMultiple);
}

function moveLightbox(direction) {
  if (state.lightboxItems.length <= 1) return;
  setLightboxImage(state.lightboxIndex + direction);
}

function openLightbox({ src, title, description, items = null, index = 0 }) {
  state.lightboxItems = Array.isArray(items) && items.length
    ? items
    : [{ src, title, description }];
  state.lightboxIndex = Math.min(Math.max(index, 0), state.lightboxItems.length - 1);
  setLightboxImage(state.lightboxIndex);
  els.lightbox.classList.remove("hidden");
  els.lightboxClose.focus();
}

function closeLightbox() {
  els.lightbox.classList.add("hidden");
  els.lightboxImage.removeAttribute("src");
  state.lightboxItems = [];
  state.lightboxIndex = 0;
  state.lightboxPointerStartX = null;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getVariantNetwork(character = getActiveCharacter(), variant = getActiveVariant(character)) {
  if (!character || !variant) return createNetworkData();
  variant.relationshipsNetwork = normalizeNetworkData(variant.relationshipsNetwork, character.name || "");
  const selfNode = variant.relationshipsNetwork.nodes.find((node) => node.isSelf);
  if (selfNode) {
    selfNode.linkedCharacterId = character.id;
    selfNode.name = character.name || "当前OC";
    selfNode.type = selfNode.type || "当前OC";
    selfNode.color = selfNode.color || "#167c80";
  }
  return variant.relationshipsNetwork;
}

function renderRelationshipNetwork(character, variant = getActiveVariant(character)) {
  const network = getVariantNetwork(character, variant);
  renderRelationshipCanvas(character, network);
  renderNetworkNodeOptions(network);
  renderExistingCharacterOptions(character, network);
  renderRelationshipList(character, variant, network);
}

function getCharacterNodeImage(character) {
  const variant = getActiveVariant(character);
  return character?.avatar || variant?.cover || "";
}

function getCharacterNodeType(character) {
  const variant = getActiveVariant(character);
  return variant?.world || variant?.role || character?.tags || "已有角色";
}

function getNetworkView(network) {
  network.view = normalizeNetworkView(network.view);
  return network.view;
}

function getNetworkViewBox(layout, network) {
  const view = getNetworkView(network);
  const width = layout.width / view.scale;
  const height = layout.height / view.scale;
  return {
    x: (layout.width - width) / 2 - view.panX,
    y: (layout.height - height) / 2 - view.panY,
    width,
    height,
  };
}

function getNetworkLayout(network) {
  const width = 760;
  const height = 500;
  const center = { x: width / 2, y: height / 2 };
  const nodes = network.nodes.map((node, index) => {
    const savedX = Number(node.x);
    const savedY = Number(node.y);
    if (Number.isFinite(savedX) && Number.isFinite(savedY)) {
      return {
        ...node,
        x: clamp(savedX, 70, width - 70),
        y: clamp(savedY, 70, height - 70),
      };
    }
    if (network.nodes.length === 1) {
      return { ...node, x: center.x, y: center.y };
    }
    const radius = Math.min(195, 118 + network.nodes.length * 14);
    const angle = (Math.PI * 2 * index) / network.nodes.length - Math.PI / 2;
    return {
      ...node,
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
    };
  });

  return {
    width,
    height,
    nodes,
    byId: Object.fromEntries(nodes.map((node) => [node.id, node])),
  };
}

function applyAutoNetworkLayout(network) {
  const width = 760;
  const height = 500;
  const center = { x: width / 2, y: height / 2 };
  network.nodes.forEach((node, index) => {
    if (network.nodes.length === 1) {
      node.x = center.x;
      node.y = center.y;
      return;
    }
    const radius = Math.min(205, 120 + network.nodes.length * 13);
    const angle = (Math.PI * 2 * index) / network.nodes.length - Math.PI / 2;
    node.x = clamp(center.x + Math.cos(angle) * radius, 70, width - 70);
    node.y = clamp(center.y + Math.sin(angle) * radius, 70, height - 70);
  });
}

async function saveActiveNetworkChange() {
  const character = getActiveCharacter();
  const variant = getActiveVariant(character);
  if (!character || !variant) return;
  await saveCharacter(character, true);
  renderRelationshipNetwork(character, variant);
  renderList();
}

async function zoomNetwork(factor) {
  const character = getActiveCharacter();
  const variant = getActiveVariant(character);
  if (!character || !variant) return;
  const view = getNetworkView(getVariantNetwork(character, variant));
  view.scale = clamp(view.scale * factor, 0.55, 2.4);
  await saveActiveNetworkChange();
}

async function resetNetworkView() {
  const character = getActiveCharacter();
  const variant = getActiveVariant(character);
  if (!character || !variant) return;
  const view = getNetworkView(getVariantNetwork(character, variant));
  view.scale = 1;
  view.panX = 0;
  view.panY = 0;
  await saveActiveNetworkChange();
}

async function resetNetworkLayout() {
  const character = getActiveCharacter();
  const variant = getActiveVariant(character);
  if (!character || !variant) return;
  const network = getVariantNetwork(character, variant);
  network.nodes.forEach((node) => {
    node.x = null;
    node.y = null;
  });
  network.view = normalizeNetworkView();
  await saveActiveNetworkChange();
}

async function autoArrangeNetwork() {
  const character = getActiveCharacter();
  const variant = getActiveVariant(character);
  if (!character || !variant) return;
  const network = getVariantNetwork(character, variant);
  applyAutoNetworkLayout(network);
  network.view = normalizeNetworkView();
  await saveActiveNetworkChange();
}

function safeDomId(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, "-");
}

function getEdgeGeometry(from, to, radius = 58, gap = 32) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const nx = -uy;
  const ny = ux;
  const offsetX = ux * radius;
  const offsetY = uy * radius;
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  return {
    x1: from.x + offsetX,
    y1: from.y + offsetY,
    x2: to.x - offsetX,
    y2: to.y - offsetY,
    midX,
    midY,
    gapX: ux * gap,
    gapY: uy * gap,
    labelX: midX,
    labelY: midY - 8,
    forwardLabelX: (from.x + midX) / 2 + nx * 18,
    forwardLabelY: (from.y + midY) / 2 + ny * 18,
    reverseLabelX: (to.x + midX) / 2 - nx * 18,
    reverseLabelY: (to.y + midY) / 2 - ny * 18,
  };
}

function edgeLineMarkup(edge, geometry, markerId) {
  const color = escapeHtml(edge.color || "#9aabba");
  const dash = edge.lineStyle === "dashed" ? 'stroke-dasharray="9 8"' : "";
  if (edge.direction === "both") {
    const reverseLabel = edge.reverseLabel || edge.label || "关系";
    return `
      <line class="edge-hit" x1="${geometry.x1}" y1="${geometry.y1}" x2="${geometry.midX - geometry.gapX}" y2="${geometry.midY - geometry.gapY}" />
      <line class="edge-hit" x1="${geometry.x2}" y1="${geometry.y2}" x2="${geometry.midX + geometry.gapX}" y2="${geometry.midY + geometry.gapY}" />
      <line class="edge-line" x1="${geometry.x1}" y1="${geometry.y1}" x2="${geometry.midX - geometry.gapX}" y2="${geometry.midY - geometry.gapY}" style="stroke: ${color}" marker-end="${markerId}" ${dash} />
      <line class="edge-line" x1="${geometry.x2}" y1="${geometry.y2}" x2="${geometry.midX + geometry.gapX}" y2="${geometry.midY + geometry.gapY}" style="stroke: ${color}" marker-end="${markerId}" ${dash} />
      <text class="edge-label" x="${geometry.forwardLabelX}" y="${geometry.forwardLabelY}">${escapeHtml(edge.label || "关系")}</text>
      <text class="edge-label" x="${geometry.reverseLabelX}" y="${geometry.reverseLabelY}">${escapeHtml(reverseLabel)}</text>
    `;
  }

  const markerStart = edge.direction === "backward" ? `marker-start="${markerId}"` : "";
  const markerEnd = edge.direction === "forward" ? `marker-end="${markerId}"` : "";
  return `
    <line class="edge-hit" x1="${geometry.x1}" y1="${geometry.y1}" x2="${geometry.x2}" y2="${geometry.y2}" />
    <line class="edge-line" x1="${geometry.x1}" y1="${geometry.y1}" x2="${geometry.x2}" y2="${geometry.y2}" style="stroke: ${color}" ${markerStart} ${markerEnd} ${dash} />
    <text class="edge-label" x="${geometry.labelX}" y="${geometry.labelY}">${escapeHtml(edge.label || "关系")}</text>
  `;
}

function renderRelationshipCanvas(character, network) {
  if (!network.nodes.length) {
    els.networkCanvas.innerHTML = `
      <div class="network-empty">
        <strong>${escapeHtml(character.name || "当前OC")}</strong>
        <span>还没有关系节点</span>
      </div>
    `;
    return;
  }

  const layout = getNetworkLayout(network);
  const viewBox = getNetworkViewBox(layout, network);
  const clipDefs = layout.nodes
    .filter((node) => node.image && !node.isSelf)
    .map(
      (node) => `
        <clipPath id="node-clip-${safeDomId(node.id)}">
          <circle cx="${node.x}" cy="${node.y}" r="48" />
        </clipPath>
      `
    )
    .join("");
  const markerDefs = network.edges
    .map((edge) => {
      const color = escapeHtml(edge.color || "#9aabba");
      const id = safeDomId(edge.id);
      return `
        <marker id="edge-arrow-${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="${color}"></path>
        </marker>
      `;
    })
    .join("");
  const lines = network.edges
    .map((edge) => {
      const from = layout.byId[edge.from];
      const to = layout.byId[edge.to];
      if (!from || !to) return "";
      const geometry = getEdgeGeometry(from, to);
      const markerId = `url(#edge-arrow-${safeDomId(edge.id)})`;
      return `
        <g class="network-edge" data-edge-id="${escapeHtml(edge.id)}" tabindex="0" role="button" aria-label="编辑连线：${escapeHtml(edge.label || "关系")}">
          ${edgeLineMarkup(edge, geometry, markerId)}
        </g>
      `;
    })
    .join("");

  const nodeMarkup = layout.nodes
    .map(
      (node) => `
        <g class="network-node ${node.isSelf ? "self" : ""} ${node.image && !node.isSelf ? "has-image" : ""}" data-node-id="${escapeHtml(node.id)}" tabindex="0" role="button" aria-label="${node.linkedCharacterId ? "打开角色" : "编辑节点"}：${escapeHtml(node.name || "未命名")}">
          ${
            node.image && !node.isSelf
              ? `<image href="${escapeHtml(node.image)}" x="${node.x - 48}" y="${node.y - 48}" width="96" height="96" preserveAspectRatio="xMidYMid slice" clip-path="url(#node-clip-${safeDomId(node.id)})" />`
              : ""
          }
          <circle cx="${node.x}" cy="${node.y}" r="52" stroke="${escapeHtml(node.color || "#b23a62")}" />
          <text x="${node.x}" y="${node.y - 4}">${escapeHtml(node.name || "未命名")}</text>
          <text class="node-subtitle" x="${node.x}" y="${node.y + 18}">${escapeHtml(node.type || "")}</text>
        </g>
      `
    )
    .join("");

  els.networkCanvas.innerHTML = `
    <svg viewBox="${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}" role="img" aria-label="${escapeHtml(character.name || "当前OC")}的关系网">
      <defs>${clipDefs}${markerDefs}</defs>
      <g class="network-lines">${lines}</g>
      ${nodeMarkup}
    </svg>
  `;
  const svg = els.networkCanvas.querySelector("svg");
  svg?.addEventListener("pointerdown", startNetworkPan);
  els.networkCanvas.querySelectorAll(".network-node").forEach((nodeElement) => {
    nodeElement.addEventListener("pointerdown", (event) => startNetworkNodeDrag(event, nodeElement.dataset.nodeId, network));
    nodeElement.addEventListener("click", () => openNetworkNode(nodeElement.dataset.nodeId, network));
    nodeElement.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openNetworkNode(nodeElement.dataset.nodeId, network);
      }
    });
  });
  els.networkCanvas.querySelectorAll(".network-edge").forEach((edgeElement) => {
    edgeElement.addEventListener("click", () => openNetworkEdge(edgeElement.dataset.edgeId, network));
    edgeElement.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openNetworkEdge(edgeElement.dataset.edgeId, network);
      }
    });
  });
}

function startNetworkPan(event) {
  if (event.button !== 0) return;
  if (event.target.closest(".network-node, .network-edge")) return;
  const character = getActiveCharacter();
  const variant = getActiveVariant(character);
  const network = getVariantNetwork(character, variant);
  const svg = event.currentTarget;
  const view = getNetworkView(network);
  const rect = svg.getBoundingClientRect();
  event.preventDefault();
  state.networkDrag = {
    type: "pan",
    pointerId: event.pointerId,
    startClientX: event.clientX,
    startClientY: event.clientY,
    startPanX: view.panX,
    startPanY: view.panY,
    viewWidth: svg.viewBox.baseVal.width,
    viewHeight: svg.viewBox.baseVal.height,
    rectWidth: rect.width || 1,
    rectHeight: rect.height || 1,
    moved: false,
  };
  svg.setPointerCapture(event.pointerId);
  svg.classList.add("panning");
}

function networkPointFromEvent(event, svg) {
  const rect = svg.getBoundingClientRect();
  const viewBox = svg.viewBox.baseVal;
  return {
    x: ((event.clientX - rect.left) / rect.width) * viewBox.width + viewBox.x,
    y: ((event.clientY - rect.top) / rect.height) * viewBox.height + viewBox.y,
  };
}

function startNetworkNodeDrag(event, nodeId, network) {
  if (event.button !== 0) return;
  const node = network.nodes.find((item) => item.id === nodeId);
  const svg = event.currentTarget.closest("svg");
  if (!node || !svg) return;
  event.preventDefault();
  event.stopPropagation();
  const point = networkPointFromEvent(event, svg);
  state.networkDrag = {
    type: "node",
    nodeId,
    pointerId: event.pointerId,
    startX: point.x,
    startY: point.y,
    moved: false,
  };
  event.currentTarget.setPointerCapture(event.pointerId);
  event.currentTarget.classList.add("dragging");
}

async function finishNetworkNodeDrag() {
  const drag = state.networkDrag;
  state.networkDrag = null;
  els.networkCanvas.querySelectorAll(".network-node.dragging").forEach((node) => node.classList.remove("dragging"));
  els.networkCanvas.querySelectorAll("svg.panning").forEach((svg) => svg.classList.remove("panning"));
  if (!drag?.moved) return;
  state.networkSuppressClick = true;
  window.setTimeout(() => {
    state.networkSuppressClick = false;
  }, 120);
  const character = getActiveCharacter();
  if (!character) return;
  await saveCharacter(character, true);
  renderRelationshipNetwork(character, getActiveVariant(character));
  renderList();
}

function moveNetworkNode(event) {
  const drag = state.networkDrag;
  if (!drag || event.pointerId !== drag.pointerId) return;
  const character = getActiveCharacter();
  const variant = getActiveVariant(character);
  const network = getVariantNetwork(character, variant);
  if (drag.type === "pan") {
    const view = getNetworkView(network);
    const dx = ((event.clientX - drag.startClientX) / drag.rectWidth) * drag.viewWidth;
    const dy = ((event.clientY - drag.startClientY) / drag.rectHeight) * drag.viewHeight;
    if (Math.hypot(event.clientX - drag.startClientX, event.clientY - drag.startClientY) > 3) {
      drag.moved = true;
    }
    view.panX = clamp(drag.startPanX + dx, -1000, 1000);
    view.panY = clamp(drag.startPanY + dy, -1000, 1000);
    renderRelationshipCanvas(character, network);
    return;
  }
  const node = network.nodes.find((item) => item.id === drag.nodeId);
  const svg = els.networkCanvas.querySelector("svg");
  if (!node || !svg) return;
  const point = networkPointFromEvent(event, svg);
  if (Math.hypot(point.x - drag.startX, point.y - drag.startY) > 3) drag.moved = true;
  node.x = clamp(point.x, 70, 690);
  node.y = clamp(point.y, 70, 430);
  renderRelationshipCanvas(character, network);
}

function renderNetworkNodeOptions(network) {
  const options = network.nodes.map((node) => {
    const option = document.createElement("option");
    option.value = node.id;
    option.textContent = node.name || "未命名节点";
    return option;
  });

  els.edgeFromInput.replaceChildren(...options.map((option) => option.cloneNode(true)));
  els.edgeToInput.replaceChildren(...options.map((option) => option.cloneNode(true)));
  if (network.nodes[0]) els.edgeFromInput.value = network.nodes[0].id;
  if (network.nodes[1]) els.edgeToInput.value = network.nodes[1].id;
}

function renderExistingCharacterOptions(character, network) {
  const linkedIds = new Set(network.nodes.map((node) => node.linkedCharacterId).filter(Boolean));
  const candidates = state.characters.filter((item) => item.id !== character?.id && !linkedIds.has(item.id));
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = candidates.length ? "选择已有角色" : "没有可添加的已有角色";
  els.existingCharacterInput.replaceChildren(placeholder);
  for (const candidate of candidates) {
    const option = document.createElement("option");
    option.value = candidate.id;
    option.textContent = candidate.name || "未命名OC";
    els.existingCharacterInput.append(option);
  }
  els.addExistingCharacterNodeBtn.disabled = !candidates.length;
}

function scrollToNetworkItem(type, id) {
  window.requestAnimationFrame(() => {
    const item = [...els.relationshipList.querySelectorAll(".relationship-item")].find(
      (entry) => entry.dataset[`network${type[0].toUpperCase()}${type.slice(1)}Id`] === id
    );
    if (!item) return;
    item.scrollIntoView({ behavior: "smooth", block: "center" });
    item.classList.add("jump-highlight");
    window.setTimeout(() => item.classList.remove("jump-highlight"), 1400);
  });
}

function openNetworkNode(nodeId, network) {
  if (state.networkSuppressClick) return;
  const node = network.nodes.find((item) => item.id === nodeId);
  if (!node) return;
  if (node.linkedCharacterId && node.linkedCharacterId !== state.activeId) {
    const target = state.characters.find((character) => character.id === node.linkedCharacterId);
    if (target) {
      state.activeId = target.id;
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
  }
  startNodeEdit(node);
  scrollToNetworkItem("node", node.id);
}

function openNetworkEdge(edgeId, network) {
  if (state.networkSuppressClick) return;
  const edge = network.edges.find((item) => item.id === edgeId);
  if (!edge) return;
  startEdgeEdit(edge);
  scrollToNetworkItem("edge", edge.id);
}

function renderNodeImagePreview(disabled = false) {
  els.nodeImageInput.disabled = disabled;
  els.clearNodeImageBtn.disabled = disabled || !state.nodeDraftImage;
  els.nodeImagePreview.classList.toggle("has-image", Boolean(state.nodeDraftImage));
  if (state.nodeDraftImage) {
    els.nodeImagePreview.style.backgroundImage = `url("${state.nodeDraftImage}")`;
    els.nodeImagePreview.textContent = "";
  } else {
    els.nodeImagePreview.style.backgroundImage = "";
    els.nodeImagePreview.textContent = disabled ? "主角" : "外貌";
  }
}

function renderRelationshipList(character, variant, network) {
  els.relationshipList.replaceChildren();

  const nodeBlock = document.createElement("section");
  nodeBlock.className = "network-list-block";
  const nodeTitle = document.createElement("h3");
  nodeTitle.textContent = "节点";
  nodeBlock.append(nodeTitle);

  for (const node of network.nodes) {
    const item = document.createElement("article");
    item.className = "relationship-item";
    item.dataset.networkNodeId = node.id;
    item.classList.toggle(
      "editing",
      state.editingNetworkItemType === "node" && node.id === state.editingNetworkItemId
    );

    const text = document.createElement("button");
    text.className = "relationship-text";
    text.type = "button";
    const title = document.createElement("strong");
    title.textContent = node.name || "未命名节点";
    const meta = document.createElement("small");
    meta.textContent = [node.type || (node.isSelf ? "当前OC" : "节点"), node.linkedCharacterId ? "已关联角色" : ""]
      .filter(Boolean)
      .join(" / ");
    text.append(title, meta);
    text.addEventListener("click", () => startNodeEdit(node));

    const thumb = document.createElement("span");
    thumb.className = "relationship-thumb";
    thumb.textContent = node.isSelf ? "主" : "图";
    if (node.image && !node.isSelf) {
      thumb.style.backgroundImage = `url("${node.image}")`;
      thumb.textContent = "";
    }

    const remove = createMiniDeleteButton("删除节点");
    remove.disabled = node.isSelf;
    remove.addEventListener("click", async () => {
      if (node.isSelf) return;
      if (!confirm(`确定删除「${node.name || "未命名节点"}」吗？相关连线也会删除。`)) return;
      network.nodes = network.nodes.filter((itemNode) => itemNode.id !== node.id);
      network.edges = network.edges.filter((edge) => edge.from !== node.id && edge.to !== node.id);
      if (state.editingNetworkItemId === node.id) clearNetworkForms();
      await saveCharacter(character, true);
      renderRelationshipNetwork(character, variant);
      renderList();
    });

    item.classList.add("node-item");
    item.append(thumb, text, remove);
    nodeBlock.append(item);
  }

  const edgeBlock = document.createElement("section");
  edgeBlock.className = "network-list-block";
  const edgeTitle = document.createElement("h3");
  edgeTitle.textContent = "连线";
  edgeBlock.append(edgeTitle);

  if (!network.edges.length) {
    const empty = document.createElement("p");
    empty.className = "muted-list-note";
    empty.textContent = "还没有连线。";
    edgeBlock.append(empty);
  }

  for (const edge of network.edges) {
    const from = network.nodes.find((node) => node.id === edge.from);
    const to = network.nodes.find((node) => node.id === edge.to);
    const item = document.createElement("article");
    item.className = "relationship-item";
    item.dataset.networkEdgeId = edge.id;
    item.classList.toggle(
      "editing",
      state.editingNetworkItemType === "edge" && edge.id === state.editingNetworkItemId
    );

    const text = document.createElement("button");
    text.className = "relationship-text";
    text.type = "button";
    const title = document.createElement("strong");
    title.textContent = `${from?.name || "未知"} → ${to?.name || "未知"}`;
    const meta = document.createElement("small");
    const directionLabel = {
      none: "无箭头",
      forward: "起点→终点",
      backward: "终点→起点",
      both: "双向",
    }[edge.direction || "forward"];
    const lineStyleLabel = edge.lineStyle === "dashed" ? "虚线" : "实线";
    meta.textContent = [edge.label, edge.reverseLabel, directionLabel, lineStyleLabel, edge.note].filter(Boolean).join(" / ") || "未命名关系";
    text.append(title, meta);
    text.addEventListener("click", () => startEdgeEdit(edge));

    const remove = createMiniDeleteButton("删除连线");
    remove.addEventListener("click", async () => {
      network.edges = network.edges.filter((itemEdge) => itemEdge.id !== edge.id);
      if (state.editingNetworkItemId === edge.id) clearNetworkForms();
      await saveCharacter(character, true);
      renderRelationshipNetwork(character, variant);
      renderList();
    });

    item.append(text, remove);
    edgeBlock.append(item);
  }

  els.relationshipList.append(nodeBlock, edgeBlock);
}

function createMiniDeleteButton(label) {
  const button = document.createElement("button");
  button.className = "icon-button mini danger";
  button.type = "button";
  button.title = label;
  button.setAttribute("aria-label", label);
  button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 11v6m4-6v6M9 7V4h6v3m-8 0 1 14h8l1-14"/></svg>';
  return button;
}

function startNodeEdit(node) {
  state.editingNetworkItemId = node.id;
  state.editingNetworkItemType = "node";
  state.nodeDraftImage = node.isSelf ? "" : node.image || "";
  els.nodeNameInput.value = node.name || "";
  els.nodeTypeInput.value = node.type || "";
  els.nodeColorInput.value = node.color || "#b23a62";
  renderNodeImagePreview(node.isSelf);
  els.addNodeBtn.textContent = "保存节点";
  els.addEdgeBtn.textContent = "添加连线";
  renderRelationshipNetwork(getActiveCharacter(), getActiveVariant());
  els.nodeNameInput.focus();
}

function startEdgeEdit(edge) {
  state.editingNetworkItemId = edge.id;
  state.editingNetworkItemType = "edge";
  state.nodeDraftImage = "";
  renderRelationshipNetwork(getActiveCharacter(), getActiveVariant());
  renderNodeImagePreview();
  els.edgeFromInput.value = edge.from;
  els.edgeToInput.value = edge.to;
  els.edgeLabelInput.value = edge.label || "";
  els.edgeReverseLabelInput.value = edge.reverseLabel || "";
  els.edgeNoteInput.value = edge.note || "";
  els.edgeColorInput.value = edge.color || "#9aabba";
  els.edgeDirectionInput.value = edge.direction || "forward";
  els.edgeLineStyleInput.value = edge.lineStyle || "solid";
  els.addNodeBtn.textContent = "添加节点";
  els.addEdgeBtn.textContent = "保存连线";
  els.edgeLabelInput.focus();
}

function clearNetworkForms() {
  state.editingNetworkItemId = null;
  state.editingNetworkItemType = null;
  state.nodeDraftImage = "";
  els.nodeNameInput.value = "";
  els.nodeTypeInput.value = "";
  els.nodeColorInput.value = "#b23a62";
  els.edgeLabelInput.value = "";
  els.edgeReverseLabelInput.value = "";
  els.edgeNoteInput.value = "";
  els.edgeColorInput.value = "#9aabba";
  els.edgeDirectionInput.value = "forward";
  els.edgeLineStyleInput.value = "solid";
  els.addNodeBtn.textContent = "添加节点";
  els.addEdgeBtn.textContent = "添加连线";
  renderNodeImagePreview();
}

async function addExistingCharacterNode() {
  const character = getActiveCharacter();
  const variant = getActiveVariant(character);
  const targetId = els.existingCharacterInput.value;
  if (!character || !variant || !targetId) return;
  const target = state.characters.find((item) => item.id === targetId);
  if (!target) return;
  const network = getVariantNetwork(character, variant);
  if (network.nodes.some((node) => node.linkedCharacterId === target.id)) return;
  network.nodes.push(
    normalizeNetworkNode({
      linkedCharacterId: target.id,
      name: target.name || "未命名OC",
      type: getCharacterNodeType(target),
      color: "#b23a62",
      image: getCharacterNodeImage(target),
      createdAt: Date.now(),
    })
  );
  clearNetworkForms();
  await saveCharacter(character, true);
  renderRelationshipNetwork(character, variant);
  renderList();
}

async function addNetworkNode() {
  const character = getActiveCharacter();
  const variant = getActiveVariant(character);
  if (!character || !variant) return;
  const network = getVariantNetwork(character, variant);
  const name = els.nodeNameInput.value.trim();
  const type = els.nodeTypeInput.value.trim();
  const color = els.nodeColorInput.value || "#b23a62";
  const image = state.nodeDraftImage;
  if (!name && !type) return;

  const existing = state.editingNetworkItemType === "node"
    ? network.nodes.find((node) => node.id === state.editingNetworkItemId)
    : null;

  if (existing) {
    existing.name = name || existing.name;
    existing.type = type;
    existing.color = color;
    if (!existing.isSelf) existing.image = image;
    existing.updatedAt = Date.now();
  } else {
    network.nodes.push(
      normalizeNetworkNode({
        name: name || "未命名节点",
        type,
        color,
        image,
        createdAt: Date.now(),
      })
    );
  }

  clearNetworkForms();
  await saveCharacter(character, true);
  renderRelationshipNetwork(character, variant);
  renderList();
  els.nodeNameInput.focus();
}

async function addNetworkEdge() {
  const character = getActiveCharacter();
  const variant = getActiveVariant(character);
  if (!character || !variant) return;
  const network = getVariantNetwork(character, variant);
  if (network.nodes.length < 2) {
    alert("至少需要两个节点才能添加连线。");
    return;
  }

  const from = els.edgeFromInput.value;
  const to = els.edgeToInput.value;
  const label = els.edgeLabelInput.value.trim();
  const reverseLabel = els.edgeReverseLabelInput.value.trim();
  const note = els.edgeNoteInput.value.trim();
  const color = els.edgeColorInput.value || "#9aabba";
  const direction = els.edgeDirectionInput.value || "forward";
  const lineStyle = els.edgeLineStyleInput.value || "solid";
  if (!from || !to || from === to) {
    alert("请选择两个不同的节点。");
    return;
  }
  if (!label && !reverseLabel && !note) return;

  const existing = state.editingNetworkItemType === "edge"
    ? network.edges.find((edge) => edge.id === state.editingNetworkItemId)
    : null;

  if (existing) {
    existing.from = from;
    existing.to = to;
    existing.label = label;
    existing.reverseLabel = reverseLabel;
    existing.note = note;
    existing.color = color;
    existing.direction = direction;
    existing.lineStyle = lineStyle;
    existing.updatedAt = Date.now();
  } else {
    network.edges.push(
      normalizeNetworkEdge({
        from,
        to,
        label,
        reverseLabel,
        note,
        color,
        direction,
        lineStyle,
        createdAt: Date.now(),
      })
    );
  }

  clearNetworkForms();
  await saveCharacter(character, true);
  renderRelationshipNetwork(character, variant);
  renderList();
  els.edgeLabelInput.focus();
}

function updateActiveFromInputs() {
  const character = getActiveCharacter();
  const variant = getActiveVariant(character);
  if (!character || !variant) return;

  for (const field of characterFields) {
    character[field] = inputByField[field].value;
  }
  for (const field of variantFields) {
    variant[field] = inputByField[field].value;
  }
  saveCharacter(character);
}

async function addVariant() {
  const character = getActiveCharacter();
  if (!character) return;

  const variant = createVariant({
    variantName: `分支 ${character.variants.length + 1}`,
  });
  character.variants.unshift(variant);
  character.activeVariantId = variant.id;
  await saveCharacter(character, true);
  renderEditor(character);
  renderList();
  inputByField.variantName.focus();
}

async function deleteVariant() {
  const character = getActiveCharacter();
  const variant = getActiveVariant(character);
  if (!character || !variant || character.variants.length <= 1) return;

  const name = variant.variantName || variant.world || "未命名分支";
  if (!confirm(`确定删除「${name}」这个设定分支吗？这个分支里的图片也会一起删除。`)) return;

  character.variants = character.variants.filter((item) => item.id !== variant.id);
  character.activeVariantId = character.variants[0].id;
  await saveCharacter(character, true);
  renderEditor(character);
  renderList();
}

async function deleteActive() {
  const character = getActiveCharacter();
  if (!character) return;
  const name = character.name || "未命名OC";
  if (!confirm(`确定删除「${name}」吗？所有设定分支都会删除，这个操作无法撤销。`)) return;

  recordHistoryBeforeSave([]);
  await requestToPromise(tx("readwrite").delete(character.id));
  state.characters = state.characters.filter((item) => item.id !== character.id);
  state.activeId = state.characters[0]?.id ?? null;
  saveSnapshot();
  updatePersistedSnapshot();
  render();
}

async function restoreLatestHistory() {
  const history = loadHistory();
  const entry = history.pop();
  if (!entry?.snapshot) {
    updateUndoButton();
    return;
  }

  let characters;
  try {
    characters = JSON.parse(entry.snapshot);
  } catch (error) {
    console.warn("撤销记录损坏", error);
    saveHistory(history);
    return;
  }

  state.restoringHistory = true;
  try {
    const normalized = (Array.isArray(characters) ? characters : []).map(normalizeCharacter);
    await requestToPromise(tx("readwrite").clear());
    for (const character of normalized) {
      await requestToPromise(tx("readwrite").put(character));
    }
    state.characters = normalized.sort((a, b) => b.updatedAt - a.updatedAt);
    state.activeId = state.characters.some((character) => character.id === state.activeId)
      ? state.activeId
      : state.characters[0]?.id ?? null;
    saveSnapshot();
    updatePersistedSnapshot();
    saveHistory(history);
    setSaveState("已撤销");
    render();
  } finally {
    state.restoringHistory = false;
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl) {
  const img = new Image();
  return new Promise((resolve, reject) => {
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

async function resizeImage(file) {
  const dataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(dataUrl);

  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  if (scale === 1 && file.size < 900000) return dataUrl;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const context = canvas.getContext("2d");
  context.drawImage(img, 0, 0, canvas.width, canvas.height);

  const type = file.type === "image/png" ? "image/png" : "image/jpeg";
  return canvas.toDataURL(type, type === "image/png" ? undefined : 0.86);
}

async function addImages(files, mode) {
  const character = getActiveCharacter();
  const variant = getActiveVariant(character);
  if (!character || !variant || !files.length) return;

  setSaveState("处理图片...");
  const images = [];
  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;
    const dataUrl = await resizeImage(file);
    images.push({
      id: crypto.randomUUID(),
      name: file.name,
      dataUrl,
      caption: "",
      createdAt: Date.now(),
    });
  }

  if (!images.length) {
    setSaveState("已保存");
    return;
  }

  if (mode === "cover") {
    variant.cover = images[0].dataUrl;
    variant.images = [...images, ...variant.images];
  } else if (mode === "illustration") {
    variant.illustrations = [...images, ...variant.illustrations];
  } else {
    variant.images = [...images, ...variant.images];
    if (!variant.cover) {
      variant.cover = images[0].dataUrl;
    }
  }

  await saveCharacter(character, true);
  renderEditor(character);
  renderList();
}

async function setCharacterAvatar(files) {
  const character = getActiveCharacter();
  const [file] = files;
  if (!character || !file || !file.type.startsWith("image/")) return;

  setSaveState("选择头像区域...");
  await openAvatarCropper(file, "avatar");
}

async function openAvatarCropper(file, target = "avatar") {
  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);

  state.avatarCrop = {
    target,
    file,
    image,
    zoom: 1,
    baseScale: 1,
    offsetX: 0,
    offsetY: 0,
    pointer: null,
  };
  els.avatarCropTitle.textContent = target === "nodeImage" ? "选择角色外貌区域" : "选择头像区域";
  els.avatarCropConfirm.textContent = target === "nodeImage" ? "保存外貌" : "保存头像";
  els.avatarCropImage.src = dataUrl;
  els.avatarCropZoom.value = "1";
  els.avatarCropper.classList.remove("hidden");
  await new Promise((resolve) => requestAnimationFrame(resolve));
  resetAvatarCrop();
}

function resetAvatarCrop() {
  const crop = state.avatarCrop;
  if (!crop) return;

  const stageSize = els.avatarCropStage.clientWidth;
  const width = crop.image.naturalWidth || crop.image.width;
  const height = crop.image.naturalHeight || crop.image.height;
  crop.baseScale = stageSize / Math.min(width, height);
  crop.zoom = Number(els.avatarCropZoom.value) || 1;
  crop.offsetX = 0;
  crop.offsetY = 0;
  renderAvatarCrop();
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function avatarCropMetrics() {
  const crop = state.avatarCrop;
  const stageSize = els.avatarCropStage.clientWidth;
  const sourceWidth = crop.image.naturalWidth || crop.image.width;
  const sourceHeight = crop.image.naturalHeight || crop.image.height;
  const scale = crop.baseScale * crop.zoom;
  const displayWidth = sourceWidth * scale;
  const displayHeight = sourceHeight * scale;
  return { stageSize, sourceWidth, sourceHeight, scale, displayWidth, displayHeight };
}

function clampAvatarCropOffset() {
  const crop = state.avatarCrop;
  if (!crop) return;

  const { stageSize, displayWidth, displayHeight } = avatarCropMetrics();
  const maxX = Math.max(0, (displayWidth - stageSize) / 2);
  const maxY = Math.max(0, (displayHeight - stageSize) / 2);
  crop.offsetX = clamp(crop.offsetX, -maxX, maxX);
  crop.offsetY = clamp(crop.offsetY, -maxY, maxY);
}

function renderAvatarCrop() {
  const crop = state.avatarCrop;
  if (!crop) return;

  clampAvatarCropOffset();
  const { stageSize, displayWidth, displayHeight } = avatarCropMetrics();
  els.avatarCropImage.style.width = `${displayWidth}px`;
  els.avatarCropImage.style.height = `${displayHeight}px`;
  els.avatarCropImage.style.left = `${stageSize / 2 + crop.offsetX - displayWidth / 2}px`;
  els.avatarCropImage.style.top = `${stageSize / 2 + crop.offsetY - displayHeight / 2}px`;
}

function croppedAvatarDataUrl() {
  const crop = state.avatarCrop;
  if (!crop) return "";

  const { stageSize, sourceWidth, sourceHeight, scale, displayWidth, displayHeight } = avatarCropMetrics();
  const outputSize = 512;
  const left = stageSize / 2 + crop.offsetX - displayWidth / 2;
  const top = stageSize / 2 + crop.offsetY - displayHeight / 2;
  const sourceSize = stageSize / scale;
  const sourceX = clamp(-left / scale, 0, sourceWidth - sourceSize);
  const sourceY = clamp(-top / scale, 0, sourceHeight - sourceSize);
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const context = canvas.getContext("2d");
  context.drawImage(crop.image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, outputSize, outputSize);
  const type = crop.file.type === "image/png" ? "image/png" : "image/jpeg";
  return canvas.toDataURL(type, type === "image/png" ? undefined : 0.9);
}

function closeAvatarCropper() {
  els.avatarCropper.classList.add("hidden");
  els.avatarCropStage.classList.remove("dragging");
  els.avatarCropImage.removeAttribute("src");
  els.avatarCropImage.removeAttribute("style");
  state.avatarCrop = null;
  setSaveState("已保存");
}

async function confirmAvatarCrop() {
  const character = getActiveCharacter();
  if (!character || !state.avatarCrop) return;

  const target = state.avatarCrop.target;
  setSaveState(target === "nodeImage" ? "处理角色外貌..." : "处理头像...");
  if (target === "nodeImage") {
    state.nodeDraftImage = croppedAvatarDataUrl();
    renderNodeImagePreview();
  } else {
    character.avatar = croppedAvatarDataUrl();
    await saveCharacter(character, true);
    renderAvatar(character);
    renderList();
  }
  closeAvatarCropper();
}

async function addComic() {
  const character = getActiveCharacter();
  const variant = getActiveVariant(character);
  if (!character || !variant) return;

  const title = els.comicTitleInput.value.trim();
  const synopsis = els.comicSynopsisInput.value.trim();
  const pages = state.comicDraftPages.map((page) => ({ ...page }));
  if (!title && !synopsis && !pages.length) return;

  const existing = variant.comics.find((comic) => comic.id === state.editingComicId);
  if (existing) {
    existing.title = title;
    existing.synopsis = synopsis;
    existing.pages = pages;
    existing.updatedAt = Date.now();
  } else {
    variant.comics.unshift({
      id: crypto.randomUUID(),
      title,
      synopsis,
      pages,
      createdAt: Date.now(),
    });
  }

  clearComicForm();
  await saveCharacter(character, true);
  renderTimelineLinkOptions(variant);
  renderTimeline(character, variant);
  renderComics(character, variant);
}

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportData() {
  const payload = {
    app: "OC资料库",
    version: 4,
    exportedAt: new Date().toISOString(),
    characters: state.characters,
  };
  const stamp = new Date().toISOString().slice(0, 10);
  download(`oc-library-${stamp}.json`, JSON.stringify(payload, null, 2), "application/json");
}

function escapeScriptJson(value) {
  return JSON.stringify(value).replace(/[<>&]/g, (char) => ({
    "<": "\\u003c",
    ">": "\\u003e",
    "&": "\\u0026",
  })[char]);
}

function exportSharePage() {
  if (!state.characters.length) {
    alert("还没有可以分享的 OC。");
    return;
  }

  const payload = {
    app: "OC资料库分享页",
    version: 1,
    exportedAt: new Date().toISOString(),
    characters: state.characters,
  };
  const stamp = new Date().toISOString().slice(0, 10);
  download(`oc-share-${stamp}.html`, buildShareHtml(payload), "text/html;charset=utf-8");
}

function buildShareHtml(payload) {
  const data = escapeScriptJson(payload);
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="theme-color" content="#f5f7fb" />
  <title>OC资料库分享页</title>
  <style>
    :root{--bg:#f5f7fb;--panel:#fff;--panel-strong:#f0f4f7;--ink:#1f2530;--muted:#697386;--line:#dce3ea;--accent:#167c80;--accent-dark:#0f5c61;--accent-soft:#dff3f1;--berry:#b23a62;--shadow:0 18px 50px rgba(31,37,48,.11);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;color-scheme:light}*{box-sizing:border-box}html{background:var(--bg);-webkit-text-size-adjust:100%}body{margin:0;min-width:320px;background:var(--bg);color:var(--ink)}button,input{font:inherit}button{cursor:pointer;touch-action:manipulation}.app{display:grid;grid-template-columns:minmax(260px,330px) minmax(0,1fr);min-height:100vh}.sidebar{display:flex;flex-direction:column;gap:16px;padding:24px;background:#fbfcfe;border-right:1px solid var(--line)}.share-header{display:grid;gap:12px}.copy-link{min-height:38px;padding:0 12px;border:1px solid var(--line);border-radius:8px;background:var(--accent-soft);color:var(--accent-dark);font-size:13px;font-weight:760;text-align:center}.copy-link.copied{border-color:var(--accent);background:var(--accent);color:#fff}.share-note{margin:-6px 0 0;color:var(--muted);font-size:12px;line-height:1.5}h1,h2,h3,p{margin-top:0}h1{margin-bottom:0;font-size:28px;line-height:1.05}h2{margin-bottom:10px;font-size:24px}.eyebrow{margin:0 0 4px;color:var(--accent);font-size:12px;font-weight:760}.search{height:44px;padding:0 12px;border:1px solid var(--line);border-radius:8px;background:#fff;outline:0}.list{display:grid;gap:10px;overflow:auto}.card{display:grid;grid-template-columns:54px minmax(0,1fr);gap:12px;align-items:center;width:100%;min-height:70px;padding:8px;border:1px solid transparent;border-radius:8px;background:transparent;color:inherit;text-align:left}.card:hover,.card.active{border-color:var(--line);background:#fff}.card.active{box-shadow:0 8px 22px rgba(22,124,128,.12)}.thumb{width:54px;height:54px;border-radius:8px;background:linear-gradient(135deg,rgba(22,124,128,.2),rgba(178,58,98,.18)),var(--panel-strong);background-size:cover;background-position:center}.card strong,.card small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.card small{color:var(--muted)}.main{min-width:0;padding:28px}.hero,.section{border:1px solid var(--line);border-radius:8px;background:var(--panel);box-shadow:var(--shadow)}.hero{display:grid;grid-template-columns:minmax(220px,360px) minmax(0,1fr);gap:22px;align-items:stretch;padding:20px}.cover{width:var(--cover-width,100%);max-width:100%;aspect-ratio:var(--cover-aspect,4/5);justify-self:center;align-self:start;border:1px solid var(--line);border-radius:8px;background:var(--panel-strong);background-size:contain;background-position:center;background-repeat:no-repeat}.cover.has-cover{border-style:solid}.cover.empty{display:grid;place-items:center;color:var(--muted);border:1px dashed #9aabba}.summary{display:grid;align-content:start;gap:14px;min-width:0}.meta{display:flex;flex-wrap:wrap;gap:8px}.pill{padding:6px 10px;border-radius:999px;background:var(--accent-soft);color:var(--accent-dark);font-size:13px;font-weight:720}.muted{color:var(--muted);line-height:1.7}.variants{display:flex;gap:10px;overflow:auto;padding-bottom:2px}.variant{flex:0 0 auto;min-height:38px;max-width:220px;padding:0 14px;border:1px solid var(--line);border-radius:8px;background:#fff;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.variant.active{border-color:var(--accent);background:var(--accent-soft);color:var(--accent-dark);font-weight:720}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px;align-items:start}.section{display:grid;gap:14px;margin-top:22px;padding:20px}.field{display:grid;gap:6px;padding:12px;border:1px solid var(--line);border-radius:8px;background:#fff}.field span{color:var(--muted);font-size:13px;font-weight:720}.field p{margin:0;white-space:pre-wrap;line-height:1.7}.field.long-field{grid-column:1/-1;padding:0;overflow:hidden}.field.long-field summary{display:flex;justify-content:space-between;gap:12px;padding:13px 14px;color:var(--muted);font-size:13px;font-weight:760;cursor:pointer;list-style:none}.field.long-field summary::-webkit-details-marker{display:none}.field.long-field summary:after{content:"展开";flex:0 0 auto;color:var(--accent-dark)}.field.long-field[open] summary{border-bottom:1px solid var(--line)}.field.long-field[open] summary:after{content:"收起"}.field.long-field p{max-height:min(48vh,520px);overflow:auto;padding:14px;line-height:1.8}.field.long-field:not([open]) p{display:none}.gallery,.comic-pages{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px}.image-card{display:grid;gap:8px;margin:0}.image-button{position:relative;aspect-ratio:1;overflow:hidden;padding:0;border:1px solid var(--line);border-radius:8px;background:var(--panel-strong)}.comic-page{aspect-ratio:3/4}.image-button img{width:100%;height:100%;object-fit:cover}.image-card figcaption{color:var(--muted);font-size:13px;line-height:1.5}.timeline{position:relative;display:grid;gap:14px;padding-left:18px}.timeline:before{content:"";position:absolute;left:6px;top:8px;bottom:8px;width:2px;border-radius:999px;background:var(--line)}.timeline-item{position:relative;display:grid;grid-template-columns:20px minmax(0,1fr);gap:10px}.timeline-dot{position:relative;z-index:1;width:14px;height:14px;margin-top:14px;border:3px solid #fff;border-radius:999px;background:var(--event-color,#167c80);box-shadow:0 0 0 2px var(--event-color,#167c80)}.timeline-body{display:grid;gap:8px;min-width:0;padding:12px;border:1px solid var(--line);border-left:4px solid var(--event-color,#167c80);border-radius:8px;background:#fff}.timeline-body strong{display:block}.timeline-body p{margin:0;color:var(--muted);line-height:1.65;white-space:pre-wrap}.timeline-meta{display:flex;flex-wrap:wrap;gap:8px;align-items:center;color:var(--muted);font-size:13px;font-weight:720}.linked-content-row{display:flex;flex-wrap:wrap;gap:8px}.link-chip{min-height:30px;max-width:100%;overflow:hidden;padding:0 10px;border:1px solid var(--line);border-radius:999px;background:var(--panel-strong);color:var(--accent-dark);font-size:12px;font-weight:720;text-overflow:ellipsis;white-space:nowrap}.jump-highlight{border-color:var(--accent)!important;box-shadow:0 0 0 4px rgba(22,124,128,.14)!important}.network{display:grid;grid-template-columns:minmax(260px,1fr) minmax(220px,360px);gap:16px;align-items:start}.network-canvas{display:grid;place-items:center;min-height:300px;border:1px solid var(--line);border-radius:8px;background:#f8fbfc;overflow:hidden}.network-canvas svg{width:100%;max-height:400px}.network-canvas line{stroke-width:2}.network-canvas text{fill:var(--ink);font-size:14px;font-weight:720;text-anchor:middle}.network-canvas .edge,.network-canvas .sub{fill:var(--muted);font-size:11px;font-weight:650}.network-canvas .center circle{fill:var(--accent)}.network-canvas .center text{fill:#fff}.network-canvas .node circle{fill:#fff;stroke-width:2}.network-canvas .node.has-image text{fill:#fff;paint-order:stroke;stroke:rgba(31,37,48,.72);stroke-width:4px}.relation-list{display:grid;gap:10px}.relation{padding:12px;border:1px solid var(--line);border-radius:8px;background:#fff}.relation strong,.comic strong{display:block}.relation small,.comic small{color:var(--muted);line-height:1.6}.comic{display:grid;gap:12px;padding:14px;border:1px solid var(--line);border-radius:8px;background:#fff}.lightbox{position:fixed;inset:0;z-index:100;display:grid;place-items:center;padding:24px;background:rgba(12,17,24,.78)}.lightbox.hidden{display:none}.lightbox button{position:fixed;right:20px;top:20px;width:42px;height:42px;border:1px solid var(--line);border-radius:8px;background:#fff}.lightbox .lightbox-nav{top:50%;width:48px;height:48px;transform:translateY(-50%)}.lightbox .lightbox-prev{left:20px;right:auto}.lightbox .lightbox-next{right:20px}.lightbox figure{display:grid;gap:14px;width:min(980px,94vw);max-height:92vh;margin:0}.lightbox img{max-width:100%;max-height:76vh;justify-self:center;border-radius:8px;object-fit:contain;box-shadow:0 24px 80px rgba(0,0,0,.34)}.lightbox figcaption{display:grid;gap:6px;padding:12px 14px;border-radius:8px;background:rgba(255,255,255,.96)}.lightbox p{margin:0;color:var(--muted);line-height:1.6}.empty{color:var(--muted);line-height:1.7}@media (max-width:860px){.app{grid-template-columns:1fr}.sidebar{min-height:auto;border-right:0;border-bottom:1px solid var(--line)}.main{padding:18px}.hero,.network{grid-template-columns:1fr}.cover.empty{min-height:280px}}@media (max-width:640px){body{min-width:0}.app{display:block;min-height:auto}.sidebar{position:sticky;top:0;z-index:20;max-height:52vh;padding:calc(12px + env(safe-area-inset-top)) 14px 12px;gap:12px;overflow:auto;box-shadow:0 10px 28px rgba(31,37,48,.08)}.sidebar header{display:flex;align-items:end;justify-content:space-between;gap:10px}.share-header{display:grid!important;align-items:stretch!important}.copy-link{min-height:36px}.eyebrow{margin:0;font-size:11px}h1{font-size:22px}h2{font-size:22px}.search{height:42px}.list{grid-auto-flow:column;grid-auto-columns:minmax(220px,82vw);overflow-x:auto;overflow-y:hidden;scroll-snap-type:x proximity;padding-bottom:4px}.card{scroll-snap-align:start;background:#fff;border-color:var(--line)}.main{padding:14px}.hero,.section{border-radius:8px}.hero{grid-template-columns:1fr;gap:14px;padding:14px}.cover.empty{min-height:220px}.summary{gap:12px}.variants{gap:8px}.variant{max-width:72vw}.grid,.network{grid-template-columns:1fr}.section{gap:12px;margin-top:14px;padding:14px}.gallery,.comic-pages{grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px}.network-canvas{min-height:240px}.network-canvas svg{max-height:320px}.relation-list{max-height:none}.timeline{padding-left:14px}.timeline-item{grid-template-columns:16px minmax(0,1fr);gap:8px}.lightbox{padding:max(12px,env(safe-area-inset-top)) 12px max(12px,env(safe-area-inset-bottom))}.lightbox button{width:44px;height:44px;right:12px;top:max(12px,env(safe-area-inset-top))}.lightbox .lightbox-nav{width:46px;height:54px}.lightbox .lightbox-prev{left:10px}.lightbox .lightbox-next{right:10px}.lightbox figure{width:100%;max-height:92vh}.lightbox img{max-height:72vh}.lightbox figcaption{max-height:18vh;overflow:auto}}
    .network-canvas .edge-line{stroke-width:2;fill:none}.network-canvas .edge-hit{stroke:transparent;stroke-width:24;fill:none}.network-canvas .edge-group,.network-canvas .node{cursor:pointer;outline:0}.network-canvas .edge-group:hover .edge-line,.network-canvas .edge-group:focus-visible .edge-line,.network-canvas .node:hover circle,.network-canvas .node:focus-visible circle{filter:drop-shadow(0 0 5px rgba(22,124,128,.36))}
  </style>
</head>
<body>
  <div class="app">
    <aside class="sidebar">
      <header class="share-header">
        <div><p class="eyebrow">只读分享</p><h1>OC资料库</h1></div>
        <button id="copyShareLink" class="copy-link" type="button">复制只读链接</button>
        <p id="shareLinkNote" class="share-note"></p>
      </header>
      <input id="search" class="search" type="search" placeholder="搜索名字、标签、世界观" />
      <div id="list" class="list"></div>
    </aside>
    <main id="main" class="main"></main>
  </div>
  <div id="lightbox" class="lightbox hidden" role="dialog" aria-modal="true" aria-label="大图浏览">
    <button id="lightboxClose" type="button" aria-label="关闭">×</button>
    <button id="lightboxPrev" class="lightbox-nav lightbox-prev" type="button" aria-label="上一张">‹</button>
    <button id="lightboxNext" class="lightbox-nav lightbox-next" type="button" aria-label="下一张">›</button>
    <figure><img id="lightboxImage" alt="大图预览" /><figcaption><strong id="lightboxTitle"></strong><p id="lightboxText"></p></figcaption></figure>
  </div>
  <script>window.__OC_SHARE_DATA__=${data};</script>
  <script>
    (function(){
      var data=window.__OC_SHARE_DATA__||{characters:[]};
      var state={characters:Array.isArray(data.characters)?data.characters:[],activeId:null,query:"",variantIds:{},lightboxItems:[],lightboxIndex:0,lightboxStartX:null};
      var list=document.getElementById("list");
      var main=document.getElementById("main");
      var search=document.getElementById("search");
      var copyShareLink=document.getElementById("copyShareLink");
      var shareLinkNote=document.getElementById("shareLinkNote");
      var lightbox=document.getElementById("lightbox");
      var lightboxImage=document.getElementById("lightboxImage");
      var lightboxTitle=document.getElementById("lightboxTitle");
      var lightboxText=document.getElementById("lightboxText");
      var lightboxPrev=document.getElementById("lightboxPrev");
      var lightboxNext=document.getElementById("lightboxNext");
      var statusLabels={draft:"🌟",active:"🌟🌟",archived:"🌟🌟🌟"};
      state.activeId=state.characters[0]&&state.characters[0].id;
      function isLocalOnlyUrl(){return location.protocol==="file:"||location.hostname==="127.0.0.1"||location.hostname==="localhost"||location.hostname==="";}
      function updateShareLinkState(){if(!copyShareLink||!shareLinkNote)return;if(isLocalOnlyUrl()){shareLinkNote.textContent="当前是本地文件或预览地址。上传到网页空间后，这里复制的链接才能发给别人打开。";copyShareLink.title="当前链接只在本机可用";}else{shareLinkNote.textContent="这是只读浏览页，复制链接后朋友只能查看，不能编辑你的资料。";copyShareLink.title="复制当前只读分享链接";}}
      function fallbackCopy(text){var input=document.createElement("textarea");input.value=text;input.setAttribute("readonly","");input.style.position="fixed";input.style.opacity="0";document.body.append(input);input.select();try{document.execCommand("copy");}finally{input.remove();}}
      async function copyReadOnlyLink(){if(isLocalOnlyUrl()){alert("当前页面还不是公网链接。请先把这个分享 HTML 上传到可访问的网址，再点击复制只读链接。");return;}try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(location.href);}else{fallbackCopy(location.href);}copyShareLink.textContent="已复制";copyShareLink.classList.add("copied");window.setTimeout(function(){copyShareLink.textContent="复制只读链接";copyShareLink.classList.remove("copied");},1600);}catch(error){prompt("复制失败，可以手动复制这个只读链接：",location.href);}}
      function text(value,fallback){return value||fallback||"";}
      function make(tag,className,content){var node=document.createElement(tag);if(className)node.className=className;if(content!==undefined)node.textContent=content;return node;}
      function imageSrc(image){return image&&(image.src||image.dataUrl||image.path||"");}
      function activeCharacter(){return state.characters.find(function(c){return c.id===state.activeId;})||state.characters[0]||null;}
      function activeVariant(character){if(!character)return null;var wanted=state.variantIds[character.id]||character.activeVariantId;return (character.variants||[]).find(function(v){return v.id===wanted;})||(character.variants||[])[0]||null;}function fitCoverFrame(element,src){var img=new Image();img.onload=function(){if(!img.naturalWidth||!img.naturalHeight)return;var ratio=img.naturalWidth/img.naturalHeight;element.style.setProperty("--cover-aspect",img.naturalWidth+" / "+img.naturalHeight);element.style.setProperty("--cover-width",ratio<.78?"min(100%, "+Math.round(ratio*560)+"px)":"100%");};img.src=src;}function normLinks(links){var seen={};return (Array.isArray(links)?links:[]).map(function(link){return {type:link.type==="comic"?"comic":link.type==="illustration"?"illustration":"",id:link.id||""};}).filter(function(link){var key=link.type+":"+link.id;if(!link.type||!link.id||seen[key])return false;seen[key]=true;return true;});}function linkedContent(variant,link){if(link.type==="comic"){var comic=(variant.comics||[]).find(function(item){return item.id===link.id;});return comic?{type:link.type,id:link.id,label:comic.title||"未命名漫画"}:null;}if(link.type==="illustration"){var index=(variant.illustrations||[]).findIndex(function(item){return item.id===link.id;});var image=(variant.illustrations||[])[index];return image?{type:link.type,id:link.id,label:image.caption||image.name||("插图 "+(index+1))}:null;}return null;}function linkedEvents(variant,type,id){return (variant.timeline||[]).filter(function(event){return normLinks(event.links).some(function(link){return link.type===type&&link.id===id;});});}function jump(selector){var element=document.querySelector(selector);if(!element)return;element.scrollIntoView({behavior:"smooth",block:"center"});element.classList.add("jump-highlight");window.setTimeout(function(){element.classList.remove("jump-highlight");},1400);}function linkChip(text,fn){var button=make("button","link-chip",text);button.type="button";button.addEventListener("click",function(event){event.stopPropagation();fn();});return button;}
      function openShareNode(characterId){if(!characterId)return;var target=state.characters.find(function(character){return character.id===characterId;});if(!target)return;state.activeId=target.id;render();window.scrollTo({top:0,behavior:"smooth"});}
      function normalizeNetwork(network,characterName,characterId){function num(value){var n=Number(value);return Number.isFinite(n)?n:null;}function node(item){return {id:item.id||("node-"+Math.random()),linkedCharacterId:item.linkedCharacterId||"",name:item.name||characterName||"未命名",type:item.type||"",color:item.color||(item.isSelf?"#167c80":"#b23a62"),image:item.image||"",x:num(item.x),y:num(item.y),isSelf:!!item.isSelf};}function edge(item){return {id:item.id||("edge-"+Math.random()),from:item.from||item.fromId||"",to:item.to||item.toId||"",label:item.label||item.type||"",reverseLabel:item.reverseLabel||"",note:item.note||"",color:item.color||"#9aabba",direction:["none","forward","backward","both"].indexOf(item.direction)>-1?item.direction:"forward",lineStyle:item.lineStyle==="dashed"?"dashed":"solid"};}if(Array.isArray(network)){var selfId="share-self";var nodes=[node({id:selfId,linkedCharacterId:characterId||"",name:characterName||"当前OC",type:"当前OC",color:"#167c80",isSelf:true})];var edges=[];network.forEach(function(relation,index){var id="legacy-"+index;nodes.push(node({id:id,name:relation.name||"未命名",type:relation.type||"",color:relation.color||"#b23a62",image:relation.image||""}));edges.push(edge({id:relation.id||("edge-"+index),from:selfId,to:id,label:relation.type||"关系",note:relation.note||"",color:relation.color||"#9aabba"}));});return {nodes:nodes,edges:edges};}var nodes=Array.isArray(network&&network.nodes)?network.nodes.map(node):[];var edges=Array.isArray(network&&network.edges)?network.edges.map(edge):[];if(!nodes.some(function(item){return item.isSelf;})){nodes.unshift(node({id:"share-self",linkedCharacterId:characterId||"",name:characterName||"当前OC",type:"当前OC",color:"#167c80",isSelf:true}));}nodes.forEach(function(item){if(item.isSelf)item.linkedCharacterId=characterId||item.linkedCharacterId;});var ids=new Set(nodes.map(function(item){return item.id;}));edges=edges.filter(function(item){return ids.has(item.from)&&ids.has(item.to)&&item.from!==item.to;});return {nodes:nodes,edges:edges};}
      function searchable(character){var variants=(character.variants||[]).map(function(v){var network=normalizeNetwork(v.relationshipsNetwork,character.name||"",character.id);var nodes=network.nodes.map(function(n){return [n.name,n.type].join(" ");}).join(" ");var edges=network.edges.map(function(e){return [e.label,e.note].join(" ");}).join(" ");var timeline=(v.timeline||[]).map(function(e){return [e.era,e.title,e.type,e.description].join(" ");}).join(" ");return [v.variantName,v.world,v.summary,v.role,v.backstory,v.detailedStory,v.relationships,timeline,nodes,edges].join(" ");}).join(" ");return [character.name,character.tags,variants].join(" ").toLowerCase();}
      function renderList(){list.replaceChildren();var q=state.query.trim().toLowerCase();var filtered=state.characters.filter(function(c){return !q||searchable(c).indexOf(q)>-1;});if(!filtered.length){list.append(make("p","empty",state.characters.length?"没有匹配的 OC。":"这个分享页里还没有 OC。"));return;}filtered.forEach(function(character){var variant=activeVariant(character);var button=make("button","card");button.type="button";button.classList.toggle("active",character.id===state.activeId);var thumb=make("span","thumb");var avatar=character.avatar||(variant&&variant.cover);if(avatar)thumb.style.backgroundImage="url('"+avatar+"')";var body=make("span","");var title=make("strong","",text(character.name,"未命名OC"));var meta=make("small","",[statusLabels[character.status]||"🌟",(character.variants||[]).length+"个分支",variant&&variant.world,character.tags].filter(Boolean).join(" / "));body.append(title,meta);button.append(thumb,body);button.addEventListener("click",function(){state.activeId=character.id;render();});list.append(button);});}
      function field(label,value){if(!value)return null;var longText=String(value).length>180||String(value).indexOf("\\n")>-1;if(longText){var details=make("details","field long-field");var summary=make("summary","",label);details.append(summary,make("p","",value));return details;}var box=make("article","field");box.append(make("span","",label),make("p","",value));return box;}
      function imageFigure(src,title,description,className,items,index,showCaption){var figure=make("figure","image-card");var button=make("button","image-button "+(className||""));button.type="button";var img=make("img");img.src=src;img.alt=title||"图片";button.append(img);button.addEventListener("click",function(){openLightbox(src,title,description,items,index||0);});figure.append(button);if(showCaption!==false&&description)figure.append(make("figcaption","",description));return figure;}
      function render(){renderList();var character=activeCharacter();if(!character){main.replaceChildren(make("p","empty","这个分享页里还没有 OC。"));return;}var variant=activeVariant(character);state.variantIds[character.id]=variant&&variant.id;main.replaceChildren();var hero=make("section","hero");var cover=make("div","cover"+(variant&&variant.cover?"":" empty"),variant&&variant.cover?"":"没有封面");if(variant&&variant.cover){cover.classList.add("has-cover");cover.style.backgroundImage="url('"+variant.cover+"')";fitCoverFrame(cover,variant.cover);}var summary=make("div","summary");summary.append(make("h2","",text(character.name,"未命名OC")));var meta=make("div","meta");[statusLabels[character.status]||"🌟",character.tags,variant&&variant.world].filter(Boolean).forEach(function(item){meta.append(make("span","pill",item));});summary.append(meta);var variants=make("div","variants");(character.variants||[]).forEach(function(item){var button=make("button","variant",item.variantName||item.world||"未命名分支");button.type="button";button.classList.toggle("active",variant&&item.id===variant.id);button.addEventListener("click",function(){state.variantIds[character.id]=item.id;render();});variants.append(button);});summary.append(variants);if(variant&&variant.summary)summary.append(make("p","muted",variant.summary));hero.append(cover,summary);main.append(hero);if(variant)renderDetails(character,variant);}
      function renderDetails(character,variant){var basics=make("section","section");basics.append(make("h3","","设定资料"));var grid=make("div","grid");[field("年龄 / 生日",variant.age),field("种族 / 身份",variant.species),field("代称",variant.pronouns),field("阵营 / 职业",variant.role),field("性格与行为习惯",variant.personality),field("外貌、服装与常用道具",variant.appearance),field("过往经历与关键事件",variant.backstory),field("详细故事正文",variant.detailedStory),field("人际关系",variant.relationships),field("杂项",variant.notes)].filter(Boolean).forEach(function(item){grid.append(item);});basics.append(grid.children.length?grid:make("p","empty","这个分支还没有文字设定。"));main.append(basics);renderGallery(variant);renderTimeline(variant);renderNetwork(character,variant);renderComics(variant);renderIllustrations(variant);}
      function renderGallery(variant){var section=make("section","section");section.append(make("h3","","图库"));var gallery=make("div","gallery");var items=(variant.images||[]).filter(function(image){return imageSrc(image);}).map(function(image){return {src:imageSrc(image),title:image.name||"图库图片",description:image.caption||""};});items.forEach(function(item,index){gallery.append(imageFigure(item.src,item.title,item.description,"",items,index));});section.append(gallery.children.length?gallery:make("p","empty","这个分支还没有图库图片。"));main.append(section);}
      function renderTimeline(variant){var section=make("section","section");section.append(make("h3","","时间轴"));var events=variant.timeline||[];if(!events.length){section.append(make("p","empty","这个分支还没有时间轴事件。"));main.append(section);return;}var list=make("div","timeline");events.forEach(function(event){var item=make("article","timeline-item");item.dataset.eventId=event.id;item.style.setProperty("--event-color",event.color||"#167c80");var dot=make("span","timeline-dot");var body=make("div","timeline-body");var meta=make("div","timeline-meta");meta.append(make("span","",event.era||"未定时间"),make("small","",event.type||"事件"));body.append(meta,make("strong","",event.title||"未命名事件"),make("p","",event.description||"没有事件说明。"));var links=make("div","linked-content-row");normLinks(event.links).map(function(link){return linkedContent(variant,link);}).filter(Boolean).forEach(function(link){links.append(linkChip((link.type==="comic"?"漫画":"插图")+"："+link.label,function(){jump("[data-linked-type=\\\""+link.type+"\\\"][data-linked-id=\\\""+link.id+"\\\"]");}));});if(links.children.length)body.append(links);item.append(dot,body);list.append(item);});section.append(list);main.append(section);}
      function renderNetwork(character,variant){var section=make("section","section");section.append(make("h3","","关系网"));var network=normalizeNetwork(variant.relationshipsNetwork,character.name||"",character.id);if(!network.nodes.length){section.append(make("p","empty","还没有关系节点。"));main.append(section);return;}var wrap=make("div","network");var canvas=make("div","network-canvas");canvas.innerHTML=networkSvg(character,network);canvas.querySelectorAll(".node").forEach(function(nodeElement){nodeElement.addEventListener("click",function(){openShareNode(nodeElement.getAttribute("data-character-id"));});nodeElement.addEventListener("keydown",function(event){if(event.key==="Enter"||event.key===" "){event.preventDefault();openShareNode(nodeElement.getAttribute("data-character-id"));}});});canvas.querySelectorAll(".edge-group").forEach(function(edgeElement){edgeElement.addEventListener("click",function(){jump('[data-share-edge-id="'+edgeElement.getAttribute("data-edge-id")+'"]');});edgeElement.addEventListener("keydown",function(event){if(event.key==="Enter"||event.key===" "){event.preventDefault();jump('[data-share-edge-id="'+edgeElement.getAttribute("data-edge-id")+'"]');}});});var relationList=make("div","relation-list");network.nodes.forEach(function(node){var item=make("article","relation");item.setAttribute("data-share-node-id",node.id);item.append(make("strong","",node.name||"未命名"),make("small","",[node.type||"节点",node.linkedCharacterId?"已关联角色":""].filter(Boolean).join(" / ")));relationList.append(item);});network.edges.forEach(function(edge){var from=network.nodes.find(function(node){return node.id===edge.from;});var to=network.nodes.find(function(node){return node.id===edge.to;});var item=make("article","relation");item.setAttribute("data-share-edge-id",edge.id);var directionLabel={none:"无箭头",forward:"起点→终点",backward:"终点→起点",both:"双向"}[edge.direction||"forward"];var lineStyleLabel=edge.lineStyle==="dashed"?"虚线":"实线";item.append(make("strong","",(from&&from.name||"未知")+" → "+(to&&to.name||"未知")),make("small","",[edge.label,edge.reverseLabel,directionLabel,lineStyleLabel,edge.note].filter(Boolean).join(" / ")||"连线"));relationList.append(item);});wrap.append(canvas,relationList);section.append(wrap);main.append(section);}
      function esc(value){return String(value||"").replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
      function safeId(value){return String(value||"").replace(/[^a-zA-Z0-9_-]/g,"-");}
      function networkSvg(character,network){var width=760,height=500,cx=width/2,cy=height/2,radius=Math.min(195,118+network.nodes.length*14);function limit(v,min,max){return Math.min(Math.max(v,min),max);}function geom(from,to){var dx=to.x-from.x,dy=to.y-from.y,len=Math.sqrt(dx*dx+dy*dy)||1,ux=dx/len,uy=dy/len,nx=-uy,ny=ux,offset=58,gap=32,mx=(from.x+to.x)/2,my=(from.y+to.y)/2;return {x1:from.x+ux*offset,y1:from.y+uy*offset,x2:to.x-ux*offset,y2:to.y-uy*offset,mx:mx,my:my,gx:ux*gap,gy:uy*gap,lx:mx,ly:my-8,flx:(from.x+mx)/2+nx*18,fly:(from.y+my)/2+ny*18,rlx:(to.x+mx)/2-nx*18,rly:(to.y+my)/2-ny*18};}var nodes=network.nodes.map(function(node,index){if(Number.isFinite(Number(node.x))&&Number.isFinite(Number(node.y)))return Object.assign({},node,{x:limit(Number(node.x),70,width-70),y:limit(Number(node.y),70,height-70)});if(network.nodes.length===1)return Object.assign({},node,{x:cx,y:cy});var angle=Math.PI*2*index/network.nodes.length-Math.PI/2;return Object.assign({},node,{x:cx+Math.cos(angle)*radius,y:cy+Math.sin(angle)*radius});});var byId={};nodes.forEach(function(node){byId[node.id]=node;});var clips=nodes.filter(function(node){return node.image&&!node.isSelf;}).map(function(node){return '<clipPath id="share-node-'+safeId(node.id)+'"><circle cx="'+node.x+'" cy="'+node.y+'" r="48"/></clipPath>';}).join("");var markers=network.edges.map(function(edge){return '<marker id="share-edge-arrow-'+safeId(edge.id)+'" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="'+esc(edge.color||"#9aabba")+'"></path></marker>';}).join("");var lines=network.edges.map(function(edge){var from=byId[edge.from],to=byId[edge.to];if(!from||!to)return "";var g=geom(from,to),marker='url(#share-edge-arrow-'+safeId(edge.id)+')',dash=edge.lineStyle==="dashed"?' stroke-dasharray="9 8"':"",color=esc(edge.color||"#9aabba");if(edge.direction==="both"){var reverse=edge.reverseLabel||edge.label||"关系";return '<g class="edge-group" data-edge-id="'+esc(edge.id)+'" tabindex="0" role="button" aria-label="查看连线：'+esc(edge.label||"关系")+'"><line class="edge-hit" x1="'+g.x1+'" y1="'+g.y1+'" x2="'+(g.mx-g.gx)+'" y2="'+(g.my-g.gy)+'"/><line class="edge-hit" x1="'+g.x2+'" y1="'+g.y2+'" x2="'+(g.mx+g.gx)+'" y2="'+(g.my+g.gy)+'"/><line class="edge-line" x1="'+g.x1+'" y1="'+g.y1+'" x2="'+(g.mx-g.gx)+'" y2="'+(g.my-g.gy)+'" style="stroke: '+color+'" marker-end="'+marker+'"'+dash+'/><line class="edge-line" x1="'+g.x2+'" y1="'+g.y2+'" x2="'+(g.mx+g.gx)+'" y2="'+(g.my+g.gy)+'" style="stroke: '+color+'" marker-end="'+marker+'"'+dash+'/><text class="edge" x="'+g.flx+'" y="'+g.fly+'">'+esc(edge.label||"关系")+'</text><text class="edge" x="'+g.rlx+'" y="'+g.rly+'">'+esc(reverse)+'</text></g>';}var start=edge.direction==="backward"?' marker-start="'+marker+'"':"",end=edge.direction==="forward"?' marker-end="'+marker+'"':"";return '<g class="edge-group" data-edge-id="'+esc(edge.id)+'" tabindex="0" role="button" aria-label="查看连线：'+esc(edge.label||"关系")+'"><line class="edge-hit" x1="'+g.x1+'" y1="'+g.y1+'" x2="'+g.x2+'" y2="'+g.y2+'"/><line class="edge-line" x1="'+g.x1+'" y1="'+g.y1+'" x2="'+g.x2+'" y2="'+g.y2+'" style="stroke: '+color+'"'+start+end+dash+'/><text class="edge" x="'+g.lx+'" y="'+g.ly+'">'+esc(edge.label||"关系")+'</text></g>';}).join("");var circles=nodes.map(function(node){var image=node.image&&!node.isSelf?'<image href="'+esc(node.image)+'" x="'+(node.x-48)+'" y="'+(node.y-48)+'" width="96" height="96" preserveAspectRatio="xMidYMid slice" clip-path="url(#share-node-'+safeId(node.id)+')"/>':'';return '<g class="node '+(node.image&&!node.isSelf?'has-image':'')+'" data-character-id="'+esc(node.linkedCharacterId||"")+'" tabindex="0" role="button" aria-label="打开角色：'+esc(node.name||"未命名")+'">'+image+'<circle cx="'+node.x+'" cy="'+node.y+'" r="52" stroke="'+esc(node.color||"#b23a62")+'"/><text x="'+node.x+'" y="'+(node.y-4)+'">'+esc(node.name||"未命名")+'</text><text class="sub" x="'+node.x+'" y="'+(node.y+18)+'">'+esc(node.type||"")+'</text></g>';}).join("");return '<svg viewBox="0 0 '+width+' '+height+'" role="img" aria-label="关系网"><defs>'+clips+markers+'</defs>'+lines+circles+'</svg>';}
      function renderComics(variant){var section=make("section","section");section.append(make("h3","","漫画"));var comics=variant.comics||[];if(!comics.length){section.append(make("p","empty","这个分支还没有漫画。"));main.append(section);return;}comics.forEach(function(comic){var item=make("article","comic");item.dataset.linkedType="comic";item.dataset.linkedId=comic.id;item.append(make("strong","",comic.title||"未命名漫画"));if(comic.synopsis)item.append(make("small","",comic.synopsis));var eventLinks=make("div","linked-content-row");linkedEvents(variant,"comic",comic.id).forEach(function(event){eventLinks.append(linkChip("对应时间轴："+(event.title||event.era||"未命名事件"),function(){jump("[data-event-id=\\\""+event.id+"\\\"]");}));});if(eventLinks.children.length)item.append(eventLinks);var pages=make("div","comic-pages");var items=(comic.pages||[]).filter(function(page){return imageSrc(page);}).map(function(page,index){return {src:imageSrc(page),title:(comic.title||"未命名漫画")+" - 第 "+(index+1)+" 页",description:comic.synopsis||""};});items.forEach(function(page,index){pages.append(imageFigure(page.src,page.title,page.description,"comic-page",items,index,false));});item.append(pages.children.length?pages:make("p","empty","这篇漫画还没有图片。"));section.append(item);});main.append(section);}
      function renderIllustrations(variant){var section=make("section","section");section.append(make("h3","","插图"));var gallery=make("div","gallery");var items=(variant.illustrations||[]).filter(function(image){return imageSrc(image);}).map(function(image){return {id:image.id,src:imageSrc(image),title:image.name||"插图",description:image.caption||""};});items.forEach(function(item,index){var figure=imageFigure(item.src,item.title,item.description,"",items,index);figure.dataset.linkedType="illustration";figure.dataset.linkedId=item.id;var eventLinks=make("div","linked-content-row");linkedEvents(variant,"illustration",item.id).forEach(function(event){eventLinks.append(linkChip("对应时间轴："+(event.title||event.era||"未命名事件"),function(){jump("[data-event-id=\\\""+event.id+"\\\"]");}));});if(eventLinks.children.length)figure.append(eventLinks);gallery.append(figure);});section.append(gallery.children.length?gallery:make("p","empty","这个分支还没有插图。"));main.append(section);}
      function setLightbox(index){if(!state.lightboxItems.length)return;state.lightboxIndex=(index+state.lightboxItems.length)%state.lightboxItems.length;var item=state.lightboxItems[state.lightboxIndex];lightboxImage.src=item.src;lightboxTitle.textContent=state.lightboxItems.length>1?(item.title||"图片")+" ("+(state.lightboxIndex+1)+"/"+state.lightboxItems.length+")":item.title||"图片";lightboxText.textContent=item.description||"";var hasMany=state.lightboxItems.length>1;lightboxPrev.classList.toggle("hidden",!hasMany);lightboxNext.classList.toggle("hidden",!hasMany);}
      function moveLightbox(direction){if(state.lightboxItems.length<=1)return;setLightbox(state.lightboxIndex+direction);}
      function openLightbox(src,title,description,items,index){state.lightboxItems=Array.isArray(items)&&items.length?items:[{src:src,title:title,description:description}];state.lightboxIndex=Math.min(Math.max(index||0,0),state.lightboxItems.length-1);setLightbox(state.lightboxIndex);lightbox.classList.remove("hidden");}
      function closeLightbox(){lightbox.classList.add("hidden");lightboxImage.removeAttribute("src");state.lightboxItems=[];state.lightboxIndex=0;state.lightboxStartX=null;}
      search.addEventListener("input",function(){state.query=search.value;renderList();});copyShareLink.addEventListener("click",copyReadOnlyLink);updateShareLinkState();document.getElementById("lightboxClose").addEventListener("click",closeLightbox);lightboxPrev.addEventListener("click",function(){moveLightbox(-1);});lightboxNext.addEventListener("click",function(){moveLightbox(1);});lightboxImage.addEventListener("pointerdown",function(event){state.lightboxStartX=event.clientX;});lightboxImage.addEventListener("pointerup",function(event){if(state.lightboxStartX===null)return;var delta=event.clientX-state.lightboxStartX;state.lightboxStartX=null;if(Math.abs(delta)<44)return;moveLightbox(delta>0?-1:1);});lightbox.addEventListener("click",function(event){if(event.target===lightbox)closeLightbox();});document.addEventListener("keydown",function(event){if(lightbox.classList.contains("hidden"))return;if(event.key==="Escape")closeLightbox();if(event.key==="ArrowLeft"){event.preventDefault();moveLightbox(-1);}if(event.key==="ArrowRight"){event.preventDefault();moveLightbox(1);}});render();
    })();
  </script>
</body>
</html>`;
}

async function importData(file) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  const imported = Array.isArray(parsed) ? parsed : parsed.characters;
  if (!Array.isArray(imported)) {
    alert("这个文件看起来不是OC资料库备份。");
    return;
  }

  const normalized = imported.map((item) =>
    normalizeCharacter({
      ...item,
      id: item.id || crypto.randomUUID(),
      updatedAt: Date.now(),
    })
  );

  recordHistoryBeforeSave(normalized);
  await requestToPromise(tx("readwrite").clear());
  for (const character of normalized) {
    await requestToPromise(tx("readwrite").put(character));
  }
  state.characters = normalized.sort((a, b) => b.updatedAt - a.updatedAt);
  saveSnapshot();
  updatePersistedSnapshot();
  await loadCharacters();
}

function wireEvents() {
  els.newCharacterBtn.addEventListener("click", addCharacter);
  els.emptyNewBtn.addEventListener("click", addCharacter);
  els.deleteBtn.addEventListener("click", deleteActive);
  els.undoBtn.addEventListener("click", restoreLatestHistory);
  els.shareBtn.addEventListener("click", exportSharePage);
  els.exportBtn.addEventListener("click", exportData);
  els.avatarButton.addEventListener("click", () => els.avatarInput.click());
  els.avatarInput.addEventListener("change", async (event) => {
    await setCharacterAvatar([...event.target.files]);
    els.avatarInput.value = "";
  });
  els.avatarCropZoom.addEventListener("input", () => {
    if (!state.avatarCrop) return;
    state.avatarCrop.zoom = Number(els.avatarCropZoom.value) || 1;
    renderAvatarCrop();
  });
  els.avatarCropConfirm.addEventListener("click", confirmAvatarCrop);
  els.avatarCropCancel.addEventListener("click", closeAvatarCropper);
  els.avatarCropCancelSecondary.addEventListener("click", closeAvatarCropper);
  els.avatarCropper.addEventListener("click", (event) => {
    if (event.target === els.avatarCropper) closeAvatarCropper();
  });
  els.avatarCropStage.addEventListener("pointerdown", (event) => {
    if (!state.avatarCrop) return;
    event.preventDefault();
    els.avatarCropStage.setPointerCapture(event.pointerId);
    els.avatarCropStage.classList.add("dragging");
    state.avatarCrop.pointer = {
      x: event.clientX,
      y: event.clientY,
      offsetX: state.avatarCrop.offsetX,
      offsetY: state.avatarCrop.offsetY,
    };
  });
  els.avatarCropStage.addEventListener("pointermove", (event) => {
    const pointer = state.avatarCrop?.pointer;
    if (!state.avatarCrop || !pointer) return;
    state.avatarCrop.offsetX = pointer.offsetX + event.clientX - pointer.x;
    state.avatarCrop.offsetY = pointer.offsetY + event.clientY - pointer.y;
    renderAvatarCrop();
  });
  ["pointerup", "pointercancel"].forEach((name) => {
    els.avatarCropStage.addEventListener(name, () => {
      if (state.avatarCrop) state.avatarCrop.pointer = null;
      els.avatarCropStage.classList.remove("dragging");
    });
  });
  document.addEventListener("pointermove", moveNetworkNode);
  document.addEventListener("pointerup", finishNetworkNodeDrag);
  document.addEventListener("pointercancel", finishNetworkNodeDrag);
  els.clearAvatarBtn.addEventListener("click", async () => {
    const character = getActiveCharacter();
    if (!character) return;
    character.avatar = "";
    await saveCharacter(character, true);
    renderAvatar(character);
    renderList();
  });
  els.addVariantBtn.addEventListener("click", addVariant);
  els.deleteVariantBtn.addEventListener("click", deleteVariant);
  els.addTimelineBtn.addEventListener("click", addTimelineEvent);
  els.cancelTimelineEditBtn.addEventListener("click", () => {
    clearTimelineForm();
    renderTimeline(getActiveCharacter(), getActiveVariant());
  });
  els.networkZoomOutBtn.addEventListener("click", () => zoomNetwork(0.85));
  els.networkZoomInBtn.addEventListener("click", () => zoomNetwork(1.18));
  els.networkResetViewBtn.addEventListener("click", resetNetworkView);
  els.networkResetLayoutBtn.addEventListener("click", resetNetworkLayout);
  els.networkAutoLayoutBtn.addEventListener("click", autoArrangeNetwork);
  els.addNodeBtn.addEventListener("click", addNetworkNode);
  els.addExistingCharacterNodeBtn.addEventListener("click", addExistingCharacterNode);
  els.addEdgeBtn.addEventListener("click", addNetworkEdge);
  els.cancelNetworkEditBtn.addEventListener("click", () => {
    clearNetworkForms();
    renderRelationshipNetwork(getActiveCharacter(), getActiveVariant());
  });
  els.nodeImageInput.addEventListener("change", async (event) => {
    const [file] = event.target.files;
    if (!file || !file.type.startsWith("image/")) return;
    setSaveState("选择角色外貌区域...");
    await openAvatarCropper(file, "nodeImage");
    els.nodeImageInput.value = "";
  });
  els.clearNodeImageBtn.addEventListener("click", () => {
    state.nodeDraftImage = "";
    renderNodeImagePreview();
  });
  els.addComicBtn.addEventListener("click", addComic);
  els.cancelComicEditBtn.addEventListener("click", () => {
    clearComicForm();
    renderComics(getActiveCharacter(), getActiveVariant());
  });
  els.comicPagesInput.addEventListener("change", async (event) => {
    await addComicFiles(event.target.files);
  });
  els.comicDropzone.addEventListener("click", () => els.comicPagesInput.click());
  els.comicDropzone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      els.comicPagesInput.click();
    }
  });
  ["dragenter", "dragover"].forEach((name) => {
    els.comicDropzone.addEventListener(name, (event) => {
      event.preventDefault();
      els.comicDropzone.classList.add("dragging");
    });
  });
  ["dragleave", "drop"].forEach((name) => {
    els.comicDropzone.addEventListener(name, (event) => {
      event.preventDefault();
      els.comicDropzone.classList.remove("dragging");
    });
  });
  els.comicDropzone.addEventListener("drop", async (event) => {
    await addComicFiles(event.dataTransfer.files);
  });
  els.lightboxClose.addEventListener("click", closeLightbox);
  els.lightboxPrev.addEventListener("click", () => moveLightbox(-1));
  els.lightboxNext.addEventListener("click", () => moveLightbox(1));
  els.lightbox.addEventListener("click", (event) => {
    if (event.target === els.lightbox) closeLightbox();
  });
  els.lightboxImage.addEventListener("pointerdown", (event) => {
    state.lightboxPointerStartX = event.clientX;
  });
  els.lightboxImage.addEventListener("pointerup", (event) => {
    if (state.lightboxPointerStartX === null) return;
    const delta = event.clientX - state.lightboxPointerStartX;
    state.lightboxPointerStartX = null;
    if (Math.abs(delta) < 44) return;
    moveLightbox(delta > 0 ? -1 : 1);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !els.avatarCropper.classList.contains("hidden")) {
      closeAvatarCropper();
      return;
    }
    if (event.key === "Escape" && !els.lightbox.classList.contains("hidden")) {
      closeLightbox();
    }
    if (els.lightbox.classList.contains("hidden")) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveLightbox(-1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      moveLightbox(1);
    }
  });
  window.addEventListener("resize", () => {
    if (!state.avatarCrop || els.avatarCropper.classList.contains("hidden")) return;
    resetAvatarCrop();
  });

  els.importInput.addEventListener("change", async (event) => {
    const [file] = event.target.files;
    if (!file) return;
    try {
      await importData(file);
    } catch (error) {
      alert("导入失败，请确认备份文件没有损坏。");
      console.error(error);
    } finally {
      els.importInput.value = "";
    }
  });

  els.searchInput.addEventListener("input", () => {
    state.query = els.searchInput.value;
    renderList();
  });

  document.querySelectorAll(".filter-chip").forEach((button) => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter;
      document
        .querySelectorAll(".filter-chip")
        .forEach((item) => item.classList.toggle("active", item === button));
      renderList();
    });
  });

  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      document
        .querySelectorAll(".tab-button")
        .forEach((item) => item.classList.toggle("active", item === button));
      document
        .querySelectorAll(".tab-panel")
        .forEach((panel) => panel.classList.toggle("active", panel.dataset.panel === button.dataset.tab));
    });
  });

  [...characterFields, ...variantFields].forEach((field) => {
    inputByField[field].addEventListener("input", updateActiveFromInputs);
  });

  els.coverDropzone.addEventListener("click", () => els.coverInput.click());
  els.coverDropzone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      els.coverInput.click();
    }
  });
  els.coverInput.addEventListener("change", (event) => addImages([...event.target.files], "cover"));
  els.galleryInput.addEventListener("change", (event) => addImages([...event.target.files], "gallery"));
  els.illustrationInput.addEventListener("change", async (event) => {
    await addImages([...event.target.files], "illustration");
    els.illustrationInput.value = "";
  });
  els.illustrationDropzone.addEventListener("click", () => els.illustrationInput.click());
  els.illustrationDropzone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      els.illustrationInput.click();
    }
  });
  ["dragenter", "dragover"].forEach((name) => {
    els.illustrationDropzone.addEventListener(name, (event) => {
      event.preventDefault();
      els.illustrationDropzone.classList.add("dragging");
    });
  });
  ["dragleave", "drop"].forEach((name) => {
    els.illustrationDropzone.addEventListener(name, (event) => {
      event.preventDefault();
      els.illustrationDropzone.classList.remove("dragging");
    });
  });
  els.illustrationDropzone.addEventListener("drop", (event) => {
    addImages([...event.dataTransfer.files], "illustration");
  });
  els.clearCoverBtn.addEventListener("click", async () => {
    const character = getActiveCharacter();
    const variant = getActiveVariant(character);
    if (!character || !variant) return;
    variant.cover = "";
    await saveCharacter(character, true);
    renderEditor(character);
    renderList();
  });

  ["dragenter", "dragover"].forEach((name) => {
    els.coverDropzone.addEventListener(name, (event) => {
      event.preventDefault();
      els.coverDropzone.classList.add("dragging");
    });
  });

  ["dragleave", "drop"].forEach((name) => {
    els.coverDropzone.addEventListener(name, (event) => {
      event.preventDefault();
      els.coverDropzone.classList.remove("dragging");
    });
  });

  els.coverDropzone.addEventListener("drop", (event) => {
    addImages([...event.dataTransfer.files], "cover");
  });

  window.addEventListener("beforeunload", saveSnapshot);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      saveSnapshot();
    }
  });
  renderNodeImagePreview();
}

function isEditorMode() {
  const params = new URLSearchParams(window.location.search);
  return params.get("edit") === "1" || params.get("mode") === "edit" || window.location.hash === "#edit";
}

async function loadRepositoryData() {
  try {
    const response = await fetch("data.json", { cache: "no-store" });
    if (!response.ok) return null;
    const payload = await response.json();
    const characters = Array.isArray(payload) ? payload : payload.characters;
    if (!Array.isArray(characters) || !characters.length) return null;
    return {
      app: payload.app || "OC资料库分享页",
      version: payload.version || 1,
      exportedAt: payload.exportedAt || "",
      characters,
    };
  } catch (error) {
    console.info("未加载仓库分享数据，继续进入编辑模式。", error);
    return null;
  }
}

async function tryRenderRepositoryShareMode() {
  if (isEditorMode()) return false;
  const payload = await loadRepositoryData();
  if (!payload) return false;
  document.open();
  document.write(buildShareHtml(payload));
  document.close();
  return true;
}

async function init() {
  if (await tryRenderRepositoryShareMode()) return;
  state.db = await openDb();
  wireEvents();
  await loadCharacters();
}

init().catch((error) => {
  console.error(error);
  alert("启动失败：浏览器可能不支持本地数据库。");
});
