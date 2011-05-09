// This files define the nabe editor.
//
// A basic standalone markdown editor written in JavaScript that uses [ace](http://ace.ajaxorg.com) 
// and a custom markdown mode.
// 
// See that editor as something between ace and showdown.
// 
// You can (while ace being focused) use
// 
// * Ctrl-M, Command-M to switch in full screen mode
// * Ctrl-S, Command-S to preview
//
(function($, undefined) {
  
  // require ace deps
  var catalog = require("pilot/plugin_manager").catalog;
  catalog.registerPlugins([ "pilot/index" ]);

  var Dom = require("pilot/dom");
  var Event = require("pilot/event");
  var Editor = require("ace/editor").Editor;
  var EditSession = require("ace/edit_session").EditSession;
  var UndoManager = require("ace/undomanager").UndoManager;
  var Renderer = require("ace/virtual_renderer").VirtualRenderer;
  var Env = require("pilot/environment");
  var MarkdownMode = require("ace/mode/markdown").Mode;
  var canon = require("pilot/canon");
  
  // ## editor
  // this object is a plain javascript object, then passed in Object.create.
  // Generally, these object follows a consistent pattern in that they should define
  // an `options` property (a default hash option, mixed in with options provided at instantiation)
  // and an `init(options, el)` method.
  var editor = {
      
      // ### default options
      options: {},
      
      // ### init(options, el)
      init: function init(options, el) {
        this.options = $.extend({}, this.options, options);
        this.el = $(el);
        this.dom = el;
        
        this.form = $('form');
        this.converter = new Showdown.converter();
        
        // wrap in the pre element with a relative div
        this.el.wrap($('<div />', {'class': 'nabe-editor-wrapper relative'}));
        this.wrapper = this.el.closest('div');
        
        // dialog, append to document.body
        this.dialog = $(document.body).nabeDialog()
          // reference the dialog instance
          .data('nabeDialog');
        
        this.buildAce();
        this.markdownMode();
        this.keybind();
        this.events();
        
        return this;
      },

      // ### buildAce()
      buildAce: function buildAce() {
        var doc, editor, env, self = this;
        
        // set up ace editor
        this.doc = doc = new EditSession(Dom.getInnerText(this.dom));
        doc.setUndoManager(new UndoManager());
        this.el.html('');
        
        // textmate theme by default
        this.editor = editor = new Editor(new Renderer(this.dom, "ace/theme/textmate"));
        editor.setSession(doc);
        
        env = Env.create();
        
        catalog.startupPlugins({ env: env }).then(function() {
          env.document = doc;
          env.editor = editor;
          editor.resize();
          Event.addListener(window, "resize", function() {
            editor.resize();
          });
          self.dom.env = env;
        });
        
        // Store env on editor such that it can be accessed later on from
        // the returned object.
        editor.env = env;
        
        return this;
      },
      

      // ### markdownMode()
      markdownMode: function markdownMode() {
        var editorWrapper = $('#gollum-editor-body-wrapper');

        //editor.setTheme("ace/theme/twilight");
        this.doc.setMode(new MarkdownMode());

        this.doc.setUseWrapMode(true);
        this.doc.setWrapLimitRange(null, null);
        this.editor.renderer.setPrintMarginColumn(400);
        
        return this;
      },
      
      // ##keybind() 
      keybind: function() {
        var self = this;
        
        canon.addCommand({
          name: 'fullsize',
          bindKey: this.bindKey('Ctrl-M', 'Command-M'),
          exec: function() {
            var pos = self.wrapper.hasClass('relative');
            
            self.wrapper[(pos ? 'remove' : 'add') + 'Class']('relative');
            
            self.editor.blur();
            self.editor.resize();
            self.editor.focus();
          }
        });

        canon.addCommand({
            name: "preview",
            bindKey: this.bindKey('Ctrl-P', 'Command-P'),
            exec: function(env, args, request) {
              self.form.trigger('submit');
            }
        });
      },
      
      bindKey: function(win, mac) {
        return {win: win, mac: mac, sender: 'editor'};
      },
      
      events: function() {
        this.form.bind('submit', $.proxy(this.previewHandler, this));
        this.form.find('select').bind('change', $.proxy(this.themeHandler, this));
        
        return this; 
      },
      
      // ### submitHandler()
      previewHandler: function(e) {
        var t = $(e.target), 
        src = this.getSource(),
        markup = this.converter.makeHtml(src);
        
        this.dialog.open({
          title: 'Preview',
          markup: markup,
          force: true
        });
        
        return false;
      },
      
      // ## changeHandler
      themeHandler: function(e) {
        this.editor.setTheme(e.target.value);
      },
      
      getSource: function() {
        return this.editor.env.document.doc.$lines.join('\n')
      },
      
      dialog: function(o) {
        $.GollumDialog.init(o);
        this.editor.blur();
        return this;
      }
  };
  
  
  // ## $().nabeEditor(options)
  // bridge in the editor object and API to the DOM using this helper function
  // It basically creates a new function on the jQuery prototype (a plugin) that
  // iterates through the jQuery selection, instantiate a new editor for each one,
  // pass in options provided and store this instance as $(el).data('nabeEditor');
  $.fn.nabeEditor = function(options) {
    
    // don't act on absent element
    if(!this.length) {return this;}
    
    // on each jq element
    return this.each(function() {
      
      // creates a new editor instance, using es5 sugar
      var instance = Object.create(editor);
      
      // Init the instance, `init` is just our constructor enhanced.
      // init should follow the `.init(options, el)` pattern with options argument
      // as an hash option.
      instance.init(options, this);
      
      // now provide a way to get this object from `$.data` and `$.fn.data`
      $.data(this, 'nabeEditor', instance);
    });
    
  };
  
})(this.jQuery, this);