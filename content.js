const CONTENT_PATH = "content/profile.md";

const escapeHtml = (value = "") => value.replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[char]));

const safeUrl = (value = "") => {
  if (!value) return "";
  try {
    const url = new URL(value, location.href);
    return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
};

const inlineMarkdown = (value = "") => escapeHtml(value)
  .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
  .replace(/\[([^\]]+)]\((https?:\/\/[^\s)]+)\)/g, (_, label, url) =>
    `<a href="${escapeHtml(safeUrl(url))}" target="_blank" rel="noopener">${label}</a>`);

function parseContent(source) {
  const match = source.replace(/\r\n/g, "\n").match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error("profile.md の先頭設定を読み取れませんでした。");

  const meta = {};
  match[1].split("\n").forEach((line) => {
    const separator = line.indexOf(":");
    if (separator > 0) meta[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  });

  const sections = {};
  let current = "";
  match[2].split("\n").forEach((line) => {
    const heading = line.match(/^# ([^#].*)$/);
    if (heading) {
      current = heading[1].trim();
      sections[current] = [];
    } else if (current) {
      sections[current].push(line);
    }
  });
  return { meta, sections };
}

function splitParagraphs(lines) {
  return lines.join("\n").trim().split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
}

function renderParagraph(text, className = "") {
  const html = text.split(/ {2}\n|\n/).map(inlineMarkdown).join("<br>");
  return `<p${className ? ` class="${className}"` : ""}>${html}</p>`;
}

function renderMore(lines) {
  const groups = [];
  let heading = "";
  let buffer = [];
  const flush = () => {
    if (buffer.length || heading) groups.push({ heading, lines: buffer });
    buffer = [];
  };
  lines.forEach((line) => {
    const match = line.match(/^## (.+)$/);
    if (match) {
      flush();
      heading = match[1].trim();
    } else {
      buffer.push(line);
    }
  });
  flush();

  return groups.map(({ heading: title, lines: groupLines }) => {
    const headingHtml = title ? `<h2>${escapeHtml(title)}</h2>` : "";
    const listItems = groupLines.filter((line) => line.startsWith("- "));
    if (listItems.length) {
      const items = listItems.map((line) => {
        const [name = "", role = "", date = ""] = line.slice(2).split("|").map((part) => part.trim());
        return `<li><strong>${inlineMarkdown(name).replace(/^<strong>|<\/strong>$/g, "")}</strong>${inlineMarkdown(role)}<span>${inlineMarkdown(date)}</span></li>`;
      }).join("");
      return `${headingHtml}<ul class="history">${items}</ul>`;
    }
    return headingHtml + splitParagraphs(groupLines).map((paragraph) => renderParagraph(paragraph)).join("");
  }).join("");
}

function renderCards(lines) {
  const cards = [];
  let card = null;
  lines.forEach((line) => {
    const heading = line.match(/^## (.+)$/);
    if (heading) {
      if (card) cards.push(card);
      card = { title: heading[1].trim(), lines: [] };
    } else if (card) {
      card.lines.push(line);
    }
  });
  if (card) cards.push(card);

  return cards.map(({ title, lines: cardLines }, index) => {
    const imageIndex = cardLines.findIndex((line) => /^!\[.*]\(.*\)$/.test(line));
    const imageMatch = imageIndex >= 0 ? cardLines[imageIndex].match(/^!\[(.*)]\((https?:\/\/.*)\)$/) : null;
    const textLines = cardLines.filter((_, lineIndex) => lineIndex !== imageIndex);
    const paragraphs = splitParagraphs(textLines).map((paragraph) => renderParagraph(paragraph)).join("");
    const image = imageMatch && safeUrl(imageMatch[2])
      ? `<img${index ? ' loading="lazy"' : ""} src="${escapeHtml(safeUrl(imageMatch[2]))}" alt="${escapeHtml(imageMatch[1])}">`
      : "";
    return `<article class="card">${image}<div class="card-body"><h2>${inlineMarkdown(title)}</h2>${paragraphs}</div></article>`;
  }).join("");
}

function setLink(id, url, label) {
  const element = document.getElementById(id);
  const safe = safeUrl(url);
  if (!element || !safe) return;
  element.href = safe;
  if (label) element.textContent = label;
}

function renderSocialLinks(meta) {
  const icons = {
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 3h4l12 18h-4L4 3Zm16 0L4 21"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor" stroke="none"/><path d="M14 7h-1.4c-1 0-1.3.5-1.3 1.4V10H14l-.4 2.6h-2.3V19" stroke="#1877ef" stroke-width="2.5"/></svg>',
    eight: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12c-2-3-3.5-4-5.5-4a4 4 0 1 0 0 8c2 0 3.5-1 5.5-4Zm0 0c2-3 3.5-4 5.5-4a4 4 0 1 1 0 8c-2 0-3.5-1-5.5-4Z"/></svg>',
    note: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h10v16H6V8l2-4Z"/><path d="M9 4v5H6"/></svg>',
    researchmap: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5M8 10.5h5M10.5 8v5"/></svg>',
    contact: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="4" width="14" height="16" rx="2"/><path d="M3 7h5M3 12h5M3 17h5M12 9h4M12 13h4"/></svg>',
  };
  const items = [
    ["x", "X", meta.x_url],
    ["facebook", "FB", meta.facebook_url],
    ["eight", "Eight", meta.eight_url],
    ["note", "note", meta.note_url],
    ["researchmap", "リサーチマップ", meta.researchmap_url],
    ["contact", "Contact", ""],
  ];
  document.getElementById("social-grid").innerHTML = items.map(([key, label, url]) => {
    const href = safeUrl(url);
    const content = `${icons[key]}<span>${label}</span>`;
    if (key === "contact") return `<button class="social-tile contact" type="button" data-open aria-label="名刺情報を表示">${content}</button>`;
    return href ? `<a class="social-tile ${key}" href="${escapeHtml(href)}" target="_blank" rel="noopener">${content}</a>`
      : `<span class="social-tile ${key}" aria-label="${label} のリンクは未設定">${content}</span>`;
  }).join("");
}

function render({ meta, sections }) {
  document.title = meta.page_title || meta.name || "プロフィール";
  document.getElementById("profile-name").textContent = meta.name || "";
  document.getElementById("name-latin").textContent = meta.name_latin || "";
  document.getElementById("tagline").textContent = meta.tagline || "";

  const avatar = document.getElementById("avatar");
  avatar.src = safeUrl(meta.avatar);
  avatar.alt = meta.avatar_alt || `${meta.name || ""}のプロフィール写真`;

  const intro = splitParagraphs(sections.Introduction || []);
  document.getElementById("intro").innerHTML = intro.map((paragraph, index) => renderParagraph(paragraph, index ? "muted" : "")).join("");
  document.getElementById("morePanel").innerHTML = renderMore(sections.More || []);
  document.getElementById("feed").innerHTML = renderCards(sections.Cards || []);
  renderSocialLinks(meta);
  document.querySelector(".social-tile.contact").addEventListener("click", () => {
    document.getElementById("dialog").hidden = false;
    document.body.style.overflow = "hidden";
  });

  const brand = document.getElementById("brand");
  if (safeUrl(meta.brand_image)) {
    brand.src = safeUrl(meta.brand_image);
    brand.alt = meta.brand_alt || "";
  } else {
    brand.remove();
  }
  document.querySelectorAll("[data-create-page]").forEach((link) => {
    if (safeUrl(meta.create_page_url)) link.href = safeUrl(meta.create_page_url);
    else link.remove();
  });
  if (!safeUrl(meta.create_page_url)) document.querySelector(".profile-actions").remove();

  document.getElementById("contact-name").textContent = [meta.name, meta.name_latin].filter(Boolean).join(" / ");
  if (meta.email) setLink("contact-email", `mailto:${meta.email}`, meta.email);
  else document.getElementById("contact-email").closest("li").remove();
  if (meta.phone) setLink("contact-phone", `tel:${meta.phone_link || meta.phone}`, meta.phone);
  else document.getElementById("contact-phone").closest("li").remove();
  setLink("contact-website", meta.website, meta.website_label || meta.website);
  if (meta.location) document.getElementById("contact-location").textContent = meta.location;
  else document.getElementById("contact-location").closest("li").remove();
  if (meta.email) document.querySelector('[data-copy="email"]').dataset.copyValue = meta.email;
  if (meta.phone) document.querySelector('[data-copy="phone"]').dataset.copyValue = meta.phone;
}

function bindInteractions() {
  const dialog = document.getElementById("dialog");
  const morePanel = document.getElementById("morePanel");
  const moreButton = document.getElementById("moreButton");
  const closeDialog = () => { dialog.hidden = true; document.body.style.overflow = ""; };

  document.querySelectorAll("[data-open]").forEach((button) => {
    button.addEventListener("click", () => { dialog.hidden = false; document.body.style.overflow = "hidden"; });
  });
  document.querySelector(".close").addEventListener("click", closeDialog);
  dialog.addEventListener("click", (event) => { if (event.target === dialog) closeDialog(); });
  addEventListener("keydown", (event) => { if (event.key === "Escape") closeDialog(); });
  moreButton.addEventListener("click", () => {
    const opening = morePanel.hidden;
    morePanel.hidden = !opening;
    moreButton.textContent = opening ? "Close" : "More";
    moreButton.setAttribute("aria-expanded", String(opening));
  });
  document.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      const original = button.textContent;
      try {
        await navigator.clipboard.writeText(button.dataset.copyValue);
        button.textContent = "コピー済み";
      } catch {
        button.textContent = "選択してコピー";
      }
      setTimeout(() => { button.textContent = original; }, 1500);
    });
  });
}

async function start() {
  bindInteractions();
  try {
    const response = await fetch(CONTENT_PATH, { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    render(parseContent(await response.text()));
  } catch (error) {
    console.error(error);
    document.getElementById("load-error").hidden = false;
  }
}

start();
