$(function(){

  // todo widgetize this
  var table = $('table'),
  form = $('form.nabe-admin-search'),
  action = form.attr('action'),
  q = form.find('input'),
  newpost = $('.nabe-buttons').find('a[href="/admin/create"]');
  dialog = $(document.body).nabeDialog().data('nabeDialog');
  
  // require text!this
  
  var tmpl = '';
  tmpl += '{{each(index, article) articles}}';
  tmpl += '<tr>';
  tmpl += '<td><a href="/admin/edit/${article.name}">${article.title}</a> <span class="small"><a href="/article/${article.name}">(link)</a></span></td>';
  tmpl += '<td>${article.date}</td>';
  tmpl += '<td>${article.author}</td>';
  tmpl += '<td><a href="/admin/edit/${article.name}">${article.name}</a></td>';
  tmpl += '</tr>';
  tmpl += '{{/each}}';
  
  $.template('tmpl.table.body', tmpl);
  

  table
    .delegate('tbody tr', 'hover', function(e) {
      var tr = $(e.target).closest('tr');
      tr.siblings().removeClass('hover');
      tr.addClass('hover');
    })
    .bind('refresh', function(e, data) { console.log('refresh with', data); table.find('tbody').html($.tmpl('tmpl.table.body', data));});
  
  dialog.on('submitDialog', function(e, seriaform) {
    document.location = '/admin/create/' + seriaform.match(/file=(.+)/)[1];
  });
  
  newpost.bind('click', function() {
    dialog.open({
      title: 'Create new post',
      markup: '<form><input type="text" name="file" autocomplete="off" placeholder="Create new post" /><form>'
    });
    return false;
  });
  
  (function(){
    var running = false;
    
    form.bind('submit', function(e) {
      if(!q.val()) { return false; }
      
      running = true;
      
      $.ajax({ url: action, data: {q: q.val()}, dataType: 'json', type: 'post' })
          .success(function(data) { running = false; table.trigger('refresh', [data]);})
          .error(function() { running = false; console.log('error: ', arguments); });
     
      
      return false;
    });

    q.bind('keyup', function(e) {
      if(e.which === 13 || running) {return;}
      form.trigger('submit');
    });
    
  })();
  
  
});