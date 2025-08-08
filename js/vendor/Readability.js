/* === Hafizh Signature Code ===
Author: Hafizh Rizqullah — GeminiAnswerBot
File: js/vendor/Readability.js
Created: 2025-08-08 16:42:03 */
/*
 * Copyright (c) 2010 Arc90 Inc
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var Readability = (function() {
  "use strict";
  var
    REGEXPS = {
      unlikelyCandidates: /-ad-|ai2html|banner|breadcrumbs|combx|comment|community|cover-wrap|disqus|extra|footer|gdpr|header|legends|menu|related|remark|replies|rss|shoutbox|sidebar|skyscraper|social|sponsor|supplemental|ad-break|agegate|pagination|pager|popup|promo|subscribe/i,
      okMaybeItsACandidate: /and|article|body|column|main|shadow/i,
      positive: /article|body|content|entry|hentry|h-entry|main|page|pagination|post|text|blog|story/i,
      negative: /hidden|hid|-ad-|ai2html|banner|combx|comment|com-|contact|foot|footer|footnote|gdpr|masthead|media|meta|outbrain|promo|related|scroll|share|shoutbox|sidebar|skyscraper|sponsor|shopping|tags|tool|widget/i,
      extraneous: /print|archive|comment|disqus|email|share|reply|login|sign|entry|community|popup|date|location|author|title|description|site-name/i,
      byline: /byline|author|dateline|writtenby|p-author/i,
      replaceFonts: /<(\/?)font[^>]*>/gi,
      normalize: /\s{2,}/g,
      videos: /\/\/(www\.)?(dailymotion|youtube|youtube-nocookie|player\.vimeo)\.com/i,
      nextLink: /(next|weiter|continue|>([^\|]|$)|»([^\|]|$))/i,
      prevLink: /(prev|earl|old|new|<|«)/i,
      whitespace: /^\s*$/,
      hasContent: /\S$/,
    };

  function Readability(doc, options) {
    options = options || {};

    this._doc = doc;
    this._docClone = this._doc.cloneNode(true);
    this._articleTitle = null;
    this._articleByline = null;
    this._articleDir = null;
    this._attempts = [];

    this._debug = !!options.debug;
    this._maxElemsToParse = options.maxElemsToParse || this.DEFAULT_MAX_ELEMS_TO_PARSE;
    this._nbTopCandidates = options.nbTopCandidates || this.DEFAULT_N_TOP_CANDIDATES;
    this._charThreshold = options.charThreshold || this.DEFAULT_CHAR_THRESHOLD;
    this._classesToPreserve = this.CLASSES_TO_PRESERVE.concat(options.classesToPreserve || []);
    this._keepClasses = !!options.keepClasses;
    this._serializer = options.serializer || function(el) {
      return el.innerHTML;
    };
    this._disableJSONLD = !!options.disableJSONLD;
    this._allowedVideoRegex = options.allowedVideoRegex || REGEXPS.videos;
  }

  Readability.prototype = {
    DEFAULT_MAX_ELEMS_TO_PARSE: 5000,
    DEFAULT_N_TOP_CANDIDATES: 5,
    DEFAULT_CHAR_THRESHOLD: 500,
    CLASSES_TO_PRESERVE: ["page"],

    parse: function() {
      this._prepDocument();
      var articleTitle = this._getArticleTitle();
      var article = this._grabArticle();
      if (!article)
        return null;

      this._postProcessContent(article);

      return {
        title: articleTitle,
        byline: this._articleByline,
        dir: this._articleDir,
        content: this._serializer(article),
        textContent: article.textContent,
        length: article.textContent.length,
        excerpt: this.getArticleExcerpt(article),
        siteName: this._getSiteName()
      };
    },

    _getArticleTitle: function() {
      var doc = this._doc;
      var curTitle = "",
        origTitle = "";

      try {
        curTitle = origTitle = doc.title;
        if (typeof curTitle !== "string")
          curTitle = origTitle = this._getInnerText(doc.getElementsByTagName('title')[0]);
      } catch (e) {}

      if (curTitle.match(/ [\|\-] /)) {
        curTitle = origTitle.replace(/(.*)[\|\-] .*/gi, '$1');

        if (curTitle.split(' ').length < 3) {
          curTitle = origTitle.replace(/[^\|\-]*[\|\-](.*)/gi, '$1');
        }
      } else if (curTitle.indexOf(': ') !== -1) {
        var betterHeader = this._getBestHeader();
        if (betterHeader) {
          curTitle = this._getInnerText(betterHeader);
        } else {
          curTitle = origTitle.substring(origTitle.lastIndexOf(':') + 1);
          if (curTitle.split(' ').length < 3) {
            curTitle = origTitle.substring(origTitle.indexOf(':') + 1);
          }
        }
      } else if (curTitle.length > 150 || curTitle.length < 15) {
        var hOnes = doc.getElementsByTagName('h1');
        if (hOnes.length === 1)
          curTitle = this._getInnerText(hOnes[0]);
      }

      curTitle = curTitle.trim();

      if (curTitle.split(' ').length <= 4) {
        curTitle = origTitle;
      }

      return curTitle;
    },

    _getBestHeader: function() {
      var doc = this._doc;
      var headers = ["h1", "h2", "h3", "h4", "h5", "h6"];
      var bestHeader = null;
      for (var i = 0; i < headers.length; i++) {
        var elems = doc.getElementsByTagName(headers[i]);
        if (elems.length > 0) {
          bestHeader = elems[0];
          break;
        }
      }
      return bestHeader;
    },

    _prepDocument: function() {
      var doc = this._doc;
      var scripts = doc.getElementsByTagName("script");
      for (var i = scripts.length - 1; i >= 0; i--) {
        scripts[i].parentNode.removeChild(scripts[i]);
      }
      var styles = doc.getElementsByTagName("style");
      for (var j = styles.length - 1; j >= 0; j--) {
        styles[j].parentNode.removeChild(styles[j]);
      }
      var body = doc.body;
      if (body) {
        body.innerHTML = body.innerHTML.replace(REGEXPS.replaceFonts, '<$1span>');
      }
    },

    getArticleExcerpt: function(article, length) {
      length = length || 250;
      var excerpt = "",
        text = article.textContent.trim();
      if (text.length > length) {
        excerpt = text.substring(0, length);
        excerpt = excerpt.substring(0, excerpt.lastIndexOf(" "));
        excerpt += "...";
      } else {
        excerpt = text;
      }
      return excerpt;
    },

    _getSiteName: function() {
      var siteName = "";
      var meta = this._doc.querySelector("meta[property='og:site_name'], meta[name='application-name']");
      if (meta) {
        siteName = meta.content;
      } else {
        siteName = this._doc.title;
      }
      return siteName;
    },

    _grabArticle: function(page) {
      var doc = this._doc;
      var isPaging = (page !== null);
      page = page ? page : this._doc.body;

      var allElements = page.getElementsByTagName('*');
      var topCandidate = null;
      var candidates = [];

      for (var el, i = 0;
        (el = allElements[i]); i++) {
        if (this._isProbablyVisible(el)) {
          var elText = this._getInnerText(el, true);
          if (!elText || elText.length < 25) {
            continue;
          }

          var ancestors = [];
          var p = el.parentNode;
          while (p) {
            ancestors.push(p);
            p = p.parentNode;
          }

          var score = 0;
          for (var j = 0; j < ancestors.length; j++) {
            var ancestor = ancestors[j];
            if (typeof ancestor.readability !== "undefined") {
              score += ancestor.readability.contentScore;
            }
          }

          if (typeof el.readability === "undefined") {
            this._initializeNode(el);
            candidates.push(el);
          }
          el.readability.contentScore += score;
        }
      }

      for (var k = 0; k < candidates.length; k++) {
        var candidate = candidates[k];
        if (candidate.readability.contentScore > (topCandidate ? topCandidate.readability.contentScore : 0)) {
          topCandidate = candidate;
        }
      }

      if (topCandidate === null || topCandidate.tagName === "BODY") {
        topCandidate = doc.createElement("div");
        topCandidate.innerHTML = page.innerHTML;
        page.innerHTML = "";
        page.appendChild(topCandidate);
        this._initializeNode(topCandidate);
      }

      var articleContent = doc.createElement("div");
      if (isPaging) {
        articleContent.id = "readability-content";
      }

      var siblingScoreThreshold = Math.max(10, topCandidate.readability.contentScore * 0.2);
      var siblingNodes = topCandidate.parentNode.childNodes;

      for (var s = 0, sl = siblingNodes.length; s < sl; s++) {
        var siblingNode = siblingNodes[s];
        var append = false;

        if (siblingNode === topCandidate) {
          append = true;
        }

        var contentBonus = 0;
        if (siblingNode.className === topCandidate.className && topCandidate.className !== "") {
          contentBonus += topCandidate.readability.contentScore * 0.2;
        }

        if (typeof siblingNode.readability !== "undefined" && (siblingNode.readability.contentScore + contentBonus) >= siblingScoreThreshold) {
          append = true;
        }

        if (siblingNode.nodeName === "P") {
          var linkDensity = this._getLinkDensity(siblingNode);
          var nodeContent = this._getInnerText(siblingNode);
          var nodeLength = nodeContent.length;

          if (nodeLength > 80 && linkDensity < 0.25) {
            append = true;
          } else if (nodeLength < 80 && linkDensity === 0 && nodeContent.search(/\.( |$)/) !== -1) {
            append = true;
          }
        }

        if (append) {
          var nodeToAppend = null;
          if (siblingNode.nodeName !== "DIV" && siblingNode.nodeName !== "P") {
            nodeToAppend = doc.createElement("div");
            try {
              nodeToAppend.id = siblingNode.id;
              nodeToAppend.innerHTML = siblingNode.innerHTML;
            } catch (e) {}
          } else {
            nodeToAppend = siblingNode;
            s -= 1;
            sl -= 1;
          }

          if (nodeToAppend.tagName !== "DIV" && nodeToAppend.tagName !== "P") {
            nodeToAppend.className = "readability-paragraph";
          }
          articleContent.appendChild(nodeToAppend);
        }
      }

      return articleContent;
    },

    _isProbablyVisible: function(node) {
      return (!node.style || node.style.display != 'none') && !node.hasAttribute('hidden');
    },

    _initializeNode: function(node) {
      node.readability = {
        contentScore: 0
      };

      switch (node.tagName) {
        case 'DIV':
          node.readability.contentScore += 5;
          break;

        case 'PRE':
        case 'TD':
        case 'BLOCKQUOTE':
          node.readability.contentScore += 3;
          break;

        case 'ADDRESS':
        case 'OL':
        case 'UL':
        case 'DL':
        case 'DD':
        case 'DT':
        case 'LI':
        case 'FORM':
          node.readability.contentScore -= 3;
          break;

        case 'H1':
        case 'H2':
        case 'H3':
        case 'H4':
        case 'H5':
        case 'H6':
        case 'TH':
          node.readability.contentScore -= 5;
          break;
      }
      node.readability.contentScore += this._getClassWeight(node);
    },

    _getInnerText: function(e, normalizeSpaces) {
      var textContent = e.textContent.trim();
      if (normalizeSpaces) {
        return textContent.replace(REGEXPS.normalize, " ");
      }
      return textContent;
    },

    _getLinkDensity: function(element) {
      var links = element.getElementsByTagName("a");
      var textLength = this._getInnerText(element).length;
      var linkLength = 0;
      for (var i = 0, l = links.length; i < l; i++) {
        linkLength += this._getInnerText(links[i]).length;
      }
      return linkLength / textLength;
    },

    _getClassWeight: function(node) {
      var weight = 0;
      if (typeof node.className === 'string' && node.className !== '') {
        if (REGEXPS.negative.test(node.className))
          weight -= 25;
        if (REGEXPS.positive.test(node.className))
          weight += 25;
      }

      if (typeof node.id === 'string' && node.id !== '') {
        if (REGEXPS.negative.test(node.id))
          weight -= 25;
        if (REGEXPS.positive.test(node.id))
          weight += 25;
      }
      return weight;
    },

    _getCharCount: function(e, s) {
      s = s || ",";
      return this._getInnerText(e).split(s).length - 1;
    },

    _cleanStyles: function(e) {
      e = e || this._doc;
      var cur = e.firstChild;

      while (cur !== null) {
        if (cur.nodeType == 1) {
          if (this._keepClasses) {
            cur.className = this._cleanClasses(cur.className);
          } else {
            cur.removeAttribute("class");
          }
          cur.removeAttribute("style");
        }
        this._cleanStyles(cur);
        cur = cur.nextSibling;
      }
    },

    _cleanClasses: function(className) {
      var classes = className.split(" ");
      var newClasses = [];
      for (var i = 0; i < classes.length; i++) {
        if (this._classesToPreserve.indexOf(classes[i]) > -1) {
          newClasses.push(classes[i]);
        }
      }
      return newClasses.join(" ");
    },

    _postProcessContent: function(articleContent) {
      this._cleanStyles(articleContent);
      this._killBreaks(articleContent);
      this._cleanConditionally(articleContent, "form");
      this._clean(articleContent, "object");
      this._clean(articleContent, "h1");

      if (articleContent.getElementsByTagName('h2').length === 1) {
        this._clean(articleContent, "h2");
      }
      this._clean(articleContent, "iframe");
      this._cleanHeaders(articleContent);
      this._cleanConditionally(articleContent, "table");
      this._cleanConditionally(articleContent, "ul");
      this._cleanConditionally(articleContent, "div");

      var articleParagraphs = articleContent.getElementsByTagName('p');
      for (var i = articleParagraphs.length - 1; i >= 0; i--) {
        var imgCount = articleParagraphs[i].getElementsByTagName('img').length;
        var embedCount = articleParagraphs[i].getElementsByTagName('embed').length;
        var objectCount = articleParagraphs[i].getElementsByTagName('object').length;
        var iframeCount = articleParagraphs[i].getElementsByTagName('iframe').length;

        if (imgCount === 0 && embedCount === 0 && objectCount === 0 && iframeCount === 0 && this._getInnerText(articleParagraphs[i], false) === '') {
          articleParagraphs[i].parentNode.removeChild(articleParagraphs[i]);
        }
      }

      try {
        articleContent.innerHTML = articleContent.innerHTML.replace(/<br[^>]*>\s*<p/gi, '<p');
      } catch (e) {}
    },

    _killBreaks: function(e) {
      try {
        e.innerHTML = e.innerHTML.replace(/(<br\s*\/?>(\s|&nbsp;?)*){1,}/g, '<br />');
      } catch (e) {}
    },

    _clean: function(e, tag) {
      var targetList = e.getElementsByTagName(tag);
      var isEmbed = (tag === 'object' || tag === 'embed' || tag === 'iframe');

      for (var y = targetList.length - 1; y >= 0; y--) {
        if (isEmbed) {
          var attributeValues = "";
          for (var i = 0, l = targetList[y].attributes.length; i < l; i++) {
            attributeValues += targetList[y].attributes[i].value + '|';
          }

          if (this._allowedVideoRegex.test(attributeValues)) {
            continue;
          }
          if (this._allowedVideoRegex.test(targetList[y].innerHTML)) {
            continue;
          }
        }
        targetList[y].parentNode.removeChild(targetList[y]);
      }
    },

    _cleanConditionally: function(e, tag) {
      var targetList = e.getElementsByTagName(tag);
      for (var y = targetList.length - 1; y >= 0; y--) {
        var weight = this._getClassWeight(targetList[y]);
        var contentScore = (typeof targetList[y].readability !== "undefined") ? targetList[y].readability.contentScore : 0;

        if (weight + contentScore < 0) {
          targetList[y].parentNode.removeChild(targetList[y]);
        } else if (this._getCharCount(targetList[y], ',') < 10) {
          var p = targetList[y].getElementsByTagName("p").length;
          var img = targetList[y].getElementsByTagName("img").length;
          var li = targetList[y].getElementsByTagName("li").length - 100;
          var input = targetList[y].getElementsByTagName("input").length;

          var embedCount = 0;
          var embeds = targetList[y].getElementsByTagName("embed");
          for (var i = 0, l = embeds.length; i < l; i++) {
            if (this._allowedVideoRegex.test(embeds[i].src)) {
              embedCount++;
            }
          }

          var linkDensity = this._getLinkDensity(targetList[y]);
          var contentLength = this._getInnerText(targetList[y]).length;
          var toRemove = false;

          if (img > p) {
            toRemove = true;
          } else if (li > p && tag !== "ul" && tag !== "ol") {
            toRemove = true;
          } else if (input > Math.floor(p / 3)) {
            toRemove = true;
          } else if (contentLength < 25 && (img === 0 || img > 2)) {
            toRemove = true;
          } else if (weight < 25 && linkDensity > 0.2) {
            toRemove = true;
          } else if (weight >= 25 && linkDensity > 0.5) {
            toRemove = true;
          } else if ((embedCount === 1 && contentLength < 75) || embedCount > 1) {
            toRemove = true;
          }

          if (toRemove) {
            targetList[y].parentNode.removeChild(targetList[y]);
          }
        }
      }
    },

    _cleanHeaders: function(e) {
      for (var headerIndex = 1; headerIndex < 7; headerIndex++) {
        var headers = e.getElementsByTagName('h' + headerIndex);
        for (var i = headers.length - 1; i >= 0; i--) {
          if (this._getClassWeight(headers[i]) < 0 || this._getLinkDensity(headers[i]) > 0.33) {
            headers[i].parentNode.removeChild(headers[i]);
          }
        }
      }
    },
  };
  return Readability;
})();