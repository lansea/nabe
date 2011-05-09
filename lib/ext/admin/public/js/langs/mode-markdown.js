define('ace/mode/markdown', ["require","exports","module", "pilot/oop","ace/mode/text","ace/tokenizer","ace/mode/markdown_highlight_rules","ace/mode/matching_brace_outdent","ace/range","ace/worker/worker_client"], 
        
function(require, exports, module) {

var oop = require("pilot/oop");
var TextMode = require("ace/mode/text").Mode;
var Tokenizer = require("ace/tokenizer").Tokenizer;
var MarkdownHighlightRules = require("ace/mode/markdown_highlight_rules").MarkdownHighlightRules;
var MatchingBraceOutdent = require("ace/mode/matching_brace_outdent").MatchingBraceOutdent;
var Range = require("ace/range").Range;

var Mode = function()
{
    this.$tokenizer = new Tokenizer(new MarkdownHighlightRules().getRules());
    this.$outdent = new MatchingBraceOutdent();
};
oop.inherits(Mode, TextMode);

(function()
{
    this.getNextLineIndent = function(state, line, tab)
    {
        if (state == "intag")
            return tab;
        
        return "";
    };

    this.checkOutdent = function(state, line, input) {
        return this.$outdent.checkOutdent(line, input);
    };

    this.autoOutdent = function(state, doc, row) {
        this.$outdent.autoOutdent(doc, row);
    };
    
}).call(Mode.prototype);

exports.Mode = Mode;

});


define("ace/mode/markdown_highlight_rules", ["require","exports","module", "pilot/oop", "ace/mode/text_highlight_rules"],
        
function(require, exports, module) {

var oop = require("pilot/oop");
var TextHighlightRules = require("ace/mode/text_highlight_rules").TextHighlightRules;

var MarkdownHighlightRules = function() {
    
    /* * /
   "keyword": "keyword",
   "keyword.operator": "keyword.operator",
   
   "constant": "constant",
   "constant.language": "constant.language",
   "constant.library": "constant.library",
   "constant.numeric": "constant.numeric",
   
   "support": "support",
   "support.function": "support.function",

   "function": "function",
   "function.buildin": "function.buildin",
   
   "invalid": "invalid",
   "invalid.illegal": "invalid.illegal",
   "invalid.deprecated": "invalid.deprecated",
   
   "string": "string",
   "string.regexp": "string.regexp",
   
   "comment": "comment",
   "comment.documentation": "comment.doc",
   "comment.documentation.tag": "comment.doc.tag",

   "variable": "variable",
   "variable.language": "variable.language",
   
   "meta.tag.sgml.doctype": "xml_pe",
   
   "collab.user1": "collab.user1"

    /* */
    
    
    this.$rules = {
      "start": [
        // headings
        {token: "keyword", regex: "[#]{1,6}.+|={1,}|-{1,}$"},
        // links
        {token: "string", regex: "\\[[^\\]]+\\]"},
        // italic
        {token: "string", regex: "\\*[^\\*]+\\*"},
        // bold
        {token: "comment", regex: "\\*\\*[^\\*]+\\*\\*"},
        // unordered list
        {token: "string", regex: "^\\s*[\\*|\\-]+.+"},
        // ordered list
        {token: "string", regex: "^\\s*\\d+\\.\\s+.+"},
        // blockquotes
        {token: "keyword.operator", regex: ">.+"}
      ]
    };
};

oop.inherits(MarkdownHighlightRules, TextHighlightRules);

exports.MarkdownHighlightRules = MarkdownHighlightRules;

});
