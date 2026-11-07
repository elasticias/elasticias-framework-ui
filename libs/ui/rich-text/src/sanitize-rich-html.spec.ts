import { sanitizeRichHtml } from './sanitize-rich-html';

/**
 * What ef-rich-text sends to the API: the few tags its toolbar can make,
 * nothing that runs, styles or tracks, and an empty string for an empty
 * editor (never Quill's `<p><br></p>`).
 */
describe('sanitizeRichHtml', () => {
    it('keeps the toolbar formats', () => {
        const html = '<p><strong>Eau</strong> <em>de</em> <u>parfum</u></p><ul><li>un</li></ul><ol><li>deux</li></ol>';
        expect(sanitizeRichHtml(html)).toBe(html);
    });

    it('returns an empty string for an empty editor', () => {
        expect(sanitizeRichHtml('<p><br></p>')).toBe('');
        expect(sanitizeRichHtml('<p>   </p><p><br></p>')).toBe('');
        expect(sanitizeRichHtml('')).toBe('');
    });

    it('drops scripts, styles and frames with their content', () => {
        expect(sanitizeRichHtml('<p>a</p><script>alert(1)</script><style>p{}</style><iframe src="x"></iframe>')).toBe('<p>a</p>');
    });

    it('drops every attribute except a safe link href', () => {
        expect(sanitizeRichHtml('<p style="color:red" class="ql-align-center" onclick="x()">a</p>')).toBe('<p>a</p>');
        expect(sanitizeRichHtml('<p><a href="https://example.com" target="_blank" onmouseover="x()">l</a></p>')).toBe(
            '<p><a href="https://example.com" rel="noopener noreferrer" target="_blank">l</a></p>',
        );
    });

    it('drops a javascript or data link but keeps its text', () => {
        expect(sanitizeRichHtml('<p><a href="javascript:alert(1)">l</a></p>')).toBe('<p>l</p>');
        expect(sanitizeRichHtml('<p><a href=" JavaScript:alert(1)">l</a></p>')).toBe('<p>l</p>');
        expect(sanitizeRichHtml('<p><a href="data:text/html,x">l</a></p>')).toBe('<p>l</p>');
    });

    it('keeps mailto and tel links', () => {
        expect(sanitizeRichHtml('<p><a href="mailto:a@b.ma">m</a></p>')).toContain('href="mailto:a@b.ma"');
        expect(sanitizeRichHtml('<p><a href="tel:+212600">t</a></p>')).toContain('href="tel:+212600"');
    });

    it('unwraps tags the toolbar cannot make, keeping their text', () => {
        expect(sanitizeRichHtml('<h1>Titre</h1><p><span>a</span><img src="x">b</p>')).toBe('Titre<p>ab</p>');
    });

    it('turns the non-breaking spaces Quill writes between words back into spaces', () => {
        expect(sanitizeRichHtml('<p>a&nbsp;b</p>')).toBe('<p>a b</p>');
    });

    it('drops the list item markers Quill 2 adds', () => {
        expect(sanitizeRichHtml('<ol><li data-list="bullet"><span class="ql-ui" contenteditable="false"></span>a</li></ol>')).toBe('<ol><li>a</li></ol>');
    });
});
