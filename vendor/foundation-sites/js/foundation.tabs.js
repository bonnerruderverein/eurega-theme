'use strict';

!function($) {

/**
 * Tabs module.
 * @module foundation.tabs
 * @requires foundation.util.keyboard
 * @requires foundation.util.timerAndImageLoader if tabs contain images
 */

class Tabs {
  /**
   * Creates a new instance of tabs.
   * @class
   * @fires Tabs#init
   * @param {jQuery} element - jQuery object to make into tabs.
   * @param {Object} options - Overrides to the default plugin settings.
   */
  constructor(element, options) {
    this.$element = element;
    this.options = $.extend({}, Tabs.defaults, this.$element.data(), options);

    this._init();
    Foundation.registerPlugin(this, 'Tabs');
    Foundation.Keyboard.register('Tabs', {
      'ENTER': 'open',
      'SPACE': 'open',
      'ARROW_RIGHT': 'next',
      'ARROW_UP': 'previous',
      'ARROW_DOWN': 'next',
      'ARROW_LEFT': 'previous'
      // 'TAB': 'next',
      // 'SHIFT_TAB': 'previous'
    });
  }

  /**
   * Initializes the tabs by showing and focusing (if autoFocus=true) the preset active tab.
   * @private
   */
  _init() {
    var _this = this;

    this.$tabTitles = this.$element.find(`.${this.options.linkClass}`);
    this.$tabContent = $(`[data-tabs-content="${this.$element[0].id}"]`);

    this.$tabTitles.each(function(){
      var $elem = $(this),
          $link = $elem.find('a'),
          isActive = $elem.hasClass('is-active'),
          hash = $link[0].hash.slice(1),
          linkId = $link[0].id ? $link[0].id : `${hash}-label`,
          $tabContent = $(`#${hash}`);

      $elem.attr({'role': 'presentation'});

      $link.attr({
        'role': 'tab',
        'aria-controls': hash,
        'aria-selected': isActive,
        'id': linkId
      });

      $tabContent.attr({
        'role': 'tabpanel',
        'aria-hidden': !isActive,
        'aria-labelledby': linkId
      });

      if(isActive && _this.options.autoFocus){
        $link.focus();
      }
    });

    if(this.options.matchHeight) {
      var $images = this.$tabContent.find('img');

      if ($images.length) {
        Foundation.onImagesLoaded($images, this._setHeight.bind(this));
      } else {
        this._setHeight();
      }
    }

    this._events();
  }

  /**
   * Adds event handlers for items within the tabs.
   * @private
   */
  _events() {
    this._addKeyHandler();
    this._addClickHandler();

    if (this.options.matchHeight) {
      $(window).on('changed.zf.mediaquery', this._setHeight.bind(this));
    }
  }

  /**
   * Adds click handlers for items within the tabs.
   * @private
   */
  _addClickHandler() {
    var _this = this;

    this.$element
      .off('click.zf.tabs')
      .on('click.zf.tabs', `.${this.options.linkClass}`, function(e){
        e.preventDefault();
        e.stopPropagation();
        if ($(this).hasClass('is-active')) {
          return;
        }
        _this._handleTabChange($(this));
      });
  }

  /**
   * Adds keyboard event handlers for items within the tabs.
   * @private
   */
  _addKeyHandler() {
    var _this = this;
    var $firstTab = _this.$element.find('li:first-of-type');
    var $lastTab = _this.$element.find('li:last-of-type');

    this.$tabTitles.off('keydown.zf.tabs').on('keydown.zf.tabs', function(e){
      if (e.which === 9) return;
      e.stopPropagation();
      e.preventDefault();

      var $element = $(this),
        $elements = $element.parent('ul').children('li'),
        $prevElement,
        $nextElement;

      $elements.each(function(i) {
        if ($(this).is($element)) {
          if (_this.options.wrapOnKeys) {
            $prevElement = i === 0 ? $elements.last() : $elements.eq(i-1);
            $nextElement = i === $elements.length -1 ? $elements.first() : $elements.eq(i+1);
          } else {
            $prevElement = $elements.eq(Math.max(0, i-1));
            $nextElement = $elements.eq(Math.min(i+1, $elements.length-1));
          }
          return;
        }
      });

      // handle keyboard event with keyboard util
      Foundation.Keyboard.handleKey(e, 'Tabs', {
        open: function() {
          $element.find('[role="tab"]').focus();
          _this._handleTabChange($element);
        },
        previous: function() {
          $prevElement.find('[role="tab"]').focus();
          _this._handleTabChange($prevElement);
        },
        next: function() {
          $nextElement.find('[role="tab"]').focus();
          _this._handleTabChange($nextElement);
        }
      });
    });
  }

  /**
   * Opens the tab `$targetContent` defined by `$target`.
   * @param {jQuery} $target - Tab to open.
   * @fires Tabs#change
   * @function
   */
  _handleTabChange($target) {
    var $tabLink = $target.find('[role="tab"]'),
        hash = $tabLink[0].hash,
        $targetContent = this.$tabContent.find(hash),
        $oldTab = this.$element.
          find(`.${this.options.linkClass}.is-active`)
          .removeClass('is-active')
          .find('[role="tab"]')
          .attr({ 'aria-selected': 'false' });

    $(`#${$oldTab.attr('aria-controls')}`)
      .removeClass('is-active')
      .attr({ 'aria-hidden': 'true' });

    $target.addClass('is-active');

    $tabLink.attr({'aria-selected': 'true'});

    $targetContent
      .addClass('is-active')
      .attr({'aria-hidden': 'false'});

    /**
     * Fires when the plugin has successfully changed tabs.
     * @event Tabs#change
     */
    this.$element.trigger('change.zf.tabs', [$target]);
  }

  /**
   * Public method for selecting a content pane to display.
   * @param {jQuery | String} elem - jQuery object or string of the id of the pane to display.
   * @function
   */
  selectTab(elem) {
    var idStr;

    if (typeof elem === 'object') {
      idStr = elem[0].id;
    } else {
      idStr = elem;
    }

    if (idStr.indexOf('#') < 0) {
      idStr = `#${idStr}`;
    }

    var $target = this.$tabTitles.find(`[href="${idStr}"]`).parent(`.${this.options.linkClass}`);

    this._handleTabChange($target);
  };
  /**
   * Sets the height of each panel to the height of the tallest panel.
   * If enabled in options, gets called on media query change.
   * If loading content via external source, can be called directly or with _reflow.
   * @function
   * @private
   */
  _setHeight() {
    var max = 0;
    this.$tabContent
      .find(`.${this.options.panelClass}`)
      .css('height', '')
      .each(function() {
        var panel = $(this),
            isActive = panel.hasClass('is-active');

        if (!isActive) {
          panel.css({'visibility': 'hidden', 'display': 'block'});
        }

        var temp = this.getBoundingClientRect().height;

        if (!isActive) {
          panel.css({
            'visibility': '',
            'display': ''
          });
        }

        max = temp > max ? temp : max;
      })
      .css('height', `${max}px`);
  }

  /**
   * Destroys an instance of an tabs.
   * @fires Tabs#destroyed
   */
  destroy() {
    this.$element
      .find(`.${this.options.linkClass}`)
      .off('.zf.tabs').hide().end()
      .find(`.${this.options.panelClass}`)
      .hide();

    if (this.options.matchHeight) {
      $(window).off('changed.zf.mediaquery');
    }

    Foundation.unregisterPlugin(this);
  }
}

Tabs.defaults = {
  /**
   * Allows the window to scroll to content of active pane on load if set to true.
   * @option
   * @example false
   */
  autoFocus: false,

  /**
   * Allows keyboard input to 'wrap' around the tab links.
   * @option
   * @example true
   */
  wrapOnKeys: true,

  /**
   * Allows the tab content panes to match heights if set to true.
   * @option
   * @example false
   */
  matchHeight: false,

  /**
   * Class applied to `li`'s in tab link list.
   * @option
   * @example 'tabs-title'
   */
  linkClass: 'tabs-title',

  /**
   * Class applied to the content containers.
   * @option
   * @example 'tabs-panel'
   */
  panelClass: 'tabs-panel'
};

function checkClass($elem){
  return $elem.hasClass('is-active');
}

// Window exports
Foundation.plugin(Tabs, 'Tabs');

}(jQuery);
