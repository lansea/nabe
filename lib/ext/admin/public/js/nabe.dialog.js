// This files define the nabe dialog.
//
// A simple dialog box widget ala github (inspired by these sexy popups on github).
// 
// Note that there will be only one instance of dialog available (no multiple dialog box). First call will
// setup necessary configuration/markup, others will just trigger a new `show`.
//
(function($) {
  
  // todo text!require this
  $.template('tmpl.nabe.dialog', '' +
  '<div class="nabe-dialog" style="display: none;">' +
  '<div class="nabe-dialog-inner csstransition-please">' +
  '<div class="nabe-dialog-bg">' +
  '<div class="nabe-dialog-title"><h4>${title}</h4>' +
  '{{if force}}<a href="#" title="min/max" class="nabe-dialog-button nabe-dialog-title-max"><span>min/max</span></a>{{/if}}' +
  '<a href="#" title="close" class="nabe-dialog-button nabe-dialog-title-close nabe-dialog-action-close"><span>[x]</span></a>' +
  '</div>' +
  '<div class="nabe-dialog-body">{{html markup}}</div>' + 
  '<div class="nabe-dialog-buttons">' +
  '<a href="#" title="Close" class="nabe-dialog-action-close nabe-button">Close</a>' +
  '</div>' +
  '</div>' +
  '</div>' + 
  '</div>');
  
  
   
  var dialog = {
       
    options: {
      defW: '650px',
      defH: '400px'
    },
     
    init: function(options, el) {
      var o = this.options = $.extend({}, this.options, options);
      
      this.el = $(el);
      this.dom = el;
      self = this;
      
      this.dialogWrapper = $('.nabe-dialog');
      
      if(!this.dialogWrapper.length) {
        this.dialogWrapper = $('<div>', {'class': 'nabe-dialog'}).appendTo(this.el);
      }
      
      this.dialog = this.template().appendTo(this.dialogWrapper);

      this.minmax();
      
      this.events();
    },

    template: function(data) {
      return $.tmpl('tmpl.nabe.dialog', data);
    },
     
    events: function() {
      this.dialogWrapper.delegate('.nabe-dialog-title-max', 'click', $.proxy(this.minmax, this));
      this.dialogWrapper.delegate('.nabe-dialog-action-close', 'click', $.proxy(this.close, this));
    },
     
    minmax: function() {
      var win = $(window),
      o = this.options,
      w = win.width() - 50,
      h = win.height() - 50,
      inner = this.dialogWrapper.find('.nabe-dialog-inner'),
      curW = inner.css('width'),
      max = curW === o.defW;
       
      this.position(
        max ? w : parseInt(o.defW.replace('px'), 10),
        max ? h : parseInt(o.defH.replace('px'), 10)
      );
      
      return false;
    },
    
    close: function() {
      this.dialogWrapper.find('.nabe-dialog').removeClass('active').hide();
      return false;
    },
    
    open: function(data) {
      var self = this,
      container;
      
      this.dialogWrapper.html(this.template(data));
      
      container = this.dialogWrapper.find('.nabe-dialog');
      
      if(data.title !== 'Preview') {
        this.dialogWrapper.find('.nabe-dialog-inner').css('height', 'auto');
        this.dialogWrapper.find('form')
        .bind('submit', function(e) {
          e.preventDefault();
          $(self).trigger('submitDialog', [$(this).serialize()]);
        });
      }
      
      container.css('display', 'none')
        .animate({opacity: 0}, {duration: 0, complete: function() {
          container.css('display', 'block');
          self.position();
          self.dialogWrapper.find('form').find('input').trigger('focus');
          container.css('display', 'block').animate({opacity: 1}, {duration: 500});
        }});
        
      return this;
    },
    
    position: function(w, h) {
      var inner = this.dialogWrapper.find('.nabe-dialog-inner'),
      dialogHeight = h || inner.height(),
      dialogWidth = w || inner.width();
     
      inner.css({
        height: dialogHeight + 'px',
        width: dialogWidth + 'px',
        'margin-top': -1 * parseInt( dialogHeight / 2 , 10),
        'margin-left': -1 * parseInt( dialogWidth / 2 , 10)
      });           
    },
    
    on: function(event, callback) {
      $(this).bind(event, callback);
    }
  };
  
  //## $().nabeEditor(options)
  // bridge in the editor object and API to the DOM using this helper function
  // It basically creates a new function on the jQuery prototype (a plugin) that
  // iterates through the jQuery selection, instantiate a new editor for each one,
  // pass in options provided and store this instance as $(el).data('nabeEditor');
  $.fn.nabeDialog = function(options) {
    
    // don't act on absent element
    if(!this.length) {return this;}
    
    // on each jq element
    return this.each(function() {
      
      // creates a new editor instance, using es5 sugar
      var instance = Object.create(dialog);
      
      // Init the instance, `init` is just our constructor enhanced.
      // init should follow the `.init(options, el)` pattern with options argument
      // as an hash option.
      instance.init(options, this);
      
      // now provide a way to get this object from `$.data` and `$.fn.data`
      $.data(this, 'nabeDialog', instance);
    });
  };
 
})(jQuery);