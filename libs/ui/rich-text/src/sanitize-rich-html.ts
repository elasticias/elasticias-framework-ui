/** The tags ef-rich-text's toolbar can make. */
const ALLOWED = new Set(['P', 'BR', 'STRONG', 'EM', 'U', 'OL', 'UL', 'LI', 'A']);

/** Removed with everything inside them. */
const DROPPED = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'TEMPLATE', 'NOSCRIPT', 'SVG', 'MATH']);

const SAFE_HREF = /^(https?:|mailto:|tel:)/i;

/**
 * Whitelists the HTML an ef-rich-text produces: the toolbar's tags, a link's
 * `href` when it is http(s), mailto or tel (with `rel` and `target` set by us),
 * and no other attribute, so no style, class or event handler leaves the
 * browser. Other tags are unwrapped, keeping their text; script, style and
 * frames go with their content. Quill's non-breaking spaces between words
 * become spaces. An editor holding no text returns `''`, never `<p><br></p>`.
 */
export function sanitizeRichHtml(html: string | null | undefined): string {
    if (!html) return '';
    const tpl = document.createElement('template');
    tpl.innerHTML = html;
    clean(tpl.content);
    if (!(tpl.content.textContent ?? '').trim()) return '';
    const out = document.createElement('div');
    out.appendChild(tpl.content);
    return out.innerHTML;
}

function clean(parent: Node): void {
    for (const node of Array.from(parent.childNodes)) {
        if (node.nodeType === Node.TEXT_NODE) {
            node.textContent = (node.textContent ?? '').replace(/\u00a0/g, ' ');
            continue;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) {
            node.parentNode?.removeChild(node);
            continue;
        }
        const el = node as Element;
        const tag = el.tagName.toUpperCase();
        if (DROPPED.has(tag) || el.classList.contains('ql-ui')) {
            el.remove();
            continue;
        }
        clean(el);
        if (!ALLOWED.has(tag)) {
            el.replaceWith(...Array.from(el.childNodes));
            continue;
        }
        const href = tag === 'A' ? (el.getAttribute('href') ?? '').trim() : '';
        for (const attr of Array.from(el.attributes)) el.removeAttribute(attr.name);
        if (tag === 'A') {
            if (!SAFE_HREF.test(href)) {
                el.replaceWith(...Array.from(el.childNodes));
                continue;
            }
            el.setAttribute('href', href);
            el.setAttribute('rel', 'noopener noreferrer');
            el.setAttribute('target', '_blank');
        }
    }
}
