/* ---------------------------------------------------------------------------
 * XML document compatibility shim.
 *
 * Prepended to the `.xhtml` flavour of the single-file bundle only. It exists
 * because pure CDNs (jsDelivr, raw.githubusercontent, statically) refuse to
 * serve `.html` as `text/html` — they force `text/plain`, so a browser shows
 * the source instead of running the game. `.xhtml` is served as
 * `application/xhtml+xml`, which browsers do render.
 *
 * Two things break in an XML document, and both are fixed here rather than in
 * the game source, so the game stays ordinary HTML-targeting code:
 *
 *  1. `innerHTML` and `insertAdjacentHTML` require well-formed XML in an XML
 *     document. The interface layer writes ordinary HTML (void elements without
 *     a trailing slash, named entities, inline SVG), which is not well-formed
 *     XML and throws. The setter below parses the markup with the HTML parser
 *     and imports the resulting nodes, which is what the author meant.
 *  2. Elements created by `createElement` in an XML document land in no
 *     namespace unless one is given, so CSS selectors and layout silently stop
 *     matching. `createElement` is redirected to `createElementNS` with the
 *     XHTML namespace.
 *
 * Anything not in an XML document falls straight through untouched.
 * --------------------------------------------------------------------------- */
(function () {
  if (typeof document === 'undefined') return;
  var isXml = document.contentType && document.contentType.indexOf('xml') !== -1;
  if (!isXml) return;

  var XHTML = 'http://www.w3.org/1999/xhtml';
  var parser = new DOMParser();

  /** Parse `markup` with the HTML parser and return nodes owned by this document. */
  function parseHtmlFragment(markup) {
    var doc = parser.parseFromString('<!DOCTYPE html><body>' + markup + '</body>', 'text/html');
    var frag = document.createDocumentFragment();
    var kids = doc.body.childNodes;
    for (var i = 0; i < kids.length; i++) frag.appendChild(document.importNode(kids[i], true));
    return frag;
  }

  var innerDesc = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
  if (innerDesc && innerDesc.set) {
    Object.defineProperty(Element.prototype, 'innerHTML', {
      configurable: true,
      enumerable: innerDesc.enumerable,
      get: innerDesc.get,
      set: function (markup) {
        // Fast path: valid XML is handled natively, which preserves exact
        // behaviour for anything already well formed.
        try {
          innerDesc.set.call(this, markup);
          return;
        } catch (err) {
          while (this.firstChild) this.removeChild(this.firstChild);
          if (markup === '' || markup == null) return;
          this.appendChild(parseHtmlFragment(String(markup)));
        }
      },
    });
  }

  var nativeInsertAdjacent = Element.prototype.insertAdjacentHTML;
  if (nativeInsertAdjacent) {
    Element.prototype.insertAdjacentHTML = function (position, markup) {
      try {
        return nativeInsertAdjacent.call(this, position, markup);
      } catch (err) {
        var frag = parseHtmlFragment(String(markup));
        var where = String(position).toLowerCase();
        if (where === 'beforebegin') this.parentNode.insertBefore(frag, this);
        else if (where === 'afterbegin') this.insertBefore(frag, this.firstChild);
        else if (where === 'beforeend') this.appendChild(frag);
        else if (where === 'afterend') this.parentNode.insertBefore(frag, this.nextSibling);
        else throw err;
      }
    };
  }

  var nativeCreateElement = Document.prototype.createElement;
  Document.prototype.createElement = function (name, options) {
    try {
      return this.createElementNS(XHTML, name, options);
    } catch (err) {
      return nativeCreateElement.call(this, name, options);
    }
  };
})();
