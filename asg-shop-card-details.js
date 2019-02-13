/**
 * `asg-shop-card-details`
 * 
 * events:
 *        use this event to fix a blip in the exit ripple on safari
 *        the underlying element should update its background-color
 *        with the color passed in event detail
 *        'asg-shop-card-details-ios-flicker-fix-on-close', {color}
 *
 *        use this event to update selected props of the card-item that opened details
 *        'asg-shop-card-details-closing', {card}
 *
 *
 * methods:
 *
 *        open(detail) accepts the event detail from 'asg-shop-card-item-open-details' event
 *        returns a promise that resolves when all opening animations are complete
 *      
 *
 * @customElement
 * @polymer
 * @demo demo/index.html
 */
import {
  SpritefulElement, 
  html
}                 from '@spriteful/spriteful-element/spriteful-element.js';
import {
  AsgShopCardMixin
}                 from '@spriteful/asg-shop-card-shared-elements/asg-shop-card-mixin.js';
import {
  getComputedStyle,
  listen, 
  schedule,
  wait
}                 from '@spriteful/utils/utils.js';
import htmlString from './asg-shop-card-details.html';
import manaIcons  from '@spriteful/asg-shop-card-shared-elements/asg-mana-icons.json';
import './asg-shop-card-detail-animations.js';
import './asg-shop-card-detail-carousel.js';
import '@spriteful/asg-shop-card-shared-elements/asg-shop-card-set.js';
import '@spriteful/asg-shop-card-shared-elements/asg-shop-card-controls.js';
import '@spriteful/asg-icons/asg-icons.js';
import '@spriteful/app-header-overlay/app-header-overlay.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/paper-fab/paper-fab.js';


class ASGShopCardDetails extends AsgShopCardMixin(SpritefulElement) {
  static get is() { return 'asg-shop-card-details'; }

  static get template() {
    return html([htmlString]);
  }


  static get properties() {
    return {     

      _animationBusy: {
        type: Boolean,
        value: true
      },

      _colors: {
        type: Array,
        value: () => ([]),
        computed: `__computeCardFaceSafeProp(card, _face, 'colors')`
      },

      _flavorText: {
        type: String,
        value: '',
        computed: `__computeCardFaceSafeProp(card, _face, 'flavor_text')`
      },

      _loyalty: {
        type: String,
        value: '',
        computed: `__computeCardFaceSafeProp(card, _face, 'loyalty')`
      },

      _manaCost: {
        type: String,
        value: '',
        computed: `__computeCardFaceSafeProp(card, _face, 'mana_cost')`
      },

      _oracleText: {
        type: String,
        value: '',
        computed: `__computeOracleText(card, _face, 'oracle_text')`
      },

      _power: {
        type: String,
        value: '',
        computed: `__computeCardFaceSafeProp(card, _face, 'power')`
      },

      _toughness: {
        type: String,
        value: '',
        computed: `__computeCardFaceSafeProp(card, _face, 'toughness')`
      }        
      
    };
  }


  static get observers() {
    return [
      '__cardImgChanged(card.image_uris, card.card_faces, _face)'
    ];
  }


  connectedCallback() {
    super.connectedCallback();

    listen(
      this.$.overlay, 
      'header-overlay-threshold-triggered-changed', 
      this.__headerThresholdTriggered.bind(this)
    );
    listen(
      this.$.overlay,
      'header-overlay-back',
      this.__overlayBackHandler.bind(this)
    );
    listen(
      this, 
      'asg-shop-card-detail-carousel-face-selected', 
      this.__lazyLoadCarouselHandler.bind(this)
    );
    listen(
      this, 
      'asg-card-controls-hide-add-to-cart',   
      this.__hideAddToCart.bind(this)
    );
  }


  __computeCardFaceSafeProp(card, face, prop) {
    if (!card) { return; }
    const {card_faces} = card;
    return card_faces ? card_faces[face][prop] : card[prop];
  }

  //computes oracle text for regular, multiface back/front, and multifaced same card
  __computeOracleText(card, face, oracle) {
      if (!card) { return; }
      const {card_faces} = card;
      if (!card_faces) {return card_faces ? card_faces[face][oracle] : card[oracle]};
      if (!card_faces[0].image_uris && oracle === 'oracle_text') {
      const newOracle = `${card_faces[0].oracle_text} or ${card_faces[1].oracle_text}`
      return newOracle;
    }
    return card_faces ? card_faces[face][oracle] : card[oracle];
  }


  __computePlaceholder(card, face) {
    if (!card) { return '#'; }
    const {card_faces, image_uris} = card;
    return card_faces && !image_uris ? 
             card_faces[face].image_uris.small : 
             image_uris.small;
  }


  __computeSrc(card, face) {
    if (!card) { return '#'; }
    const {card_faces, image_uris} = card;
    return card_faces && !image_uris ? 
             card_faces[face].image_uris.medium : 
             image_uris.medium;
  }


  __computeBlurredImgFallbackClass(card, face) {
    if (!card) { return; }
    const {card_faces, image_uris} = card;
    if (card_faces && !image_uris) {
      const {art_crop} = card_faces[face].image_uris;
      return art_crop ? '' : 'blurred-img-fallback';
    }
    if (image_uris) {      
      return image_uris.art_crop ? '' : 'blurred-img-fallback';
    }
    return '';
  }


  __computeMagicManaIcons(mana) {
    if (!mana) { return; }
    const noCurlys = mana.
                       split('{').
                       map(str => str.replace('}', '')).
                       filter(str => str);
    return noCurlys.map(str => manaIcons[str]);
  }


  __computeMagicColorIcons(colors) {
    if (!colors) { return; }
    return colors.map(str => manaIcons[str]);
  }

  
  async __cardImgChanged(uris, faces, face) {
    try {
      if (!uris && !faces) { 
        this.$.blurredImg.style.opacity = '1';
        this.$.blurredImg.style.backgroundImage = 
          `linear-gradient(
             to bottom, 
             var(--safari-clear, rgba(0, 0, 0, 0)), 
             var(--light-color) 70%),
           radial-gradient(
             ellipse at bottom, 
             var(--safari-clear, rgba(0, 0, 0, 0)), 
             var(--dark-vibrant-color, rgb(33, 33, 33)) 90%),       
           url(#)`;
        return; 
      }
      const {art_crop, small} = faces && !uris ? 
                                  faces[face].image_uris : 
                                  uris; 
      const src  = art_crop ? art_crop : small;
      const img  = new Image();
      img.src    = src;
      img.onload = async () => {
        await schedule();
        this.$.blurredImg.style.opacity = '1';
      };
      this.$.blurredImg.style.opacity = '0';
      this.$.blurredImg.style.backgroundImage = 
        `linear-gradient(
           to bottom, 
           var(--safari-clear, rgba(0, 0, 0, 0)), 
           var(--light-color) 70%),
         radial-gradient(
           ellipse at bottom, 
           var(--safari-clear, rgba(0, 0, 0, 0)), 
           var(--dark-vibrant-color, rgb(33, 33, 33)) 90%),       
         url(${src})`;
    }
    catch (error) {
      console.error(error);
    }
  }


  async __overlayBackHandler(event) {
    if (this._animationBusy) { return; }
    const {clickEvent} = event.detail;
    const {x, y}       = clickEvent;
    this.$.controls.closeConditionSelector();
    this.__closeFab();
    await schedule();
    await this.$.animations.exit(x, y);
    this.$.carousel.cleanup();
    const color = getComputedStyle(this, '--accent-color');
    const card  = this.$.controls.addSelectedToCard();
    this.fire('asg-shop-card-details-ios-flicker-fix-on-close', {color});
    // use this event to update selected props of the card-item that opened details
    this.fire('asg-shop-card-details-closing', {card});
    await this.$.overlay.back();
    await schedule();
    this.fire('asg-shop-card-details-ios-flicker-fix-on-close', {color: ''});
    this.$.animations.finish(250);
  }


  __lazyLoadCarouselHandler(event) {
    this._face = event.detail.face;
  }


  async __addToCardFabClicked() {
    try {
      await this.clicked();
      const card = this.$.controls.addSelectedToCard();
      this.fire('asg-shop-card-details-add-to-cart', {card});
    }
    catch (error) {
      if (error === 'click debounced') { return; }
      console.error(error);
    }
  }


  __colorOverlayHeader() {    
    this.$.headerBackground.style.opacity = '1';
    this.$.overlay.header.shadow          = true;
  }


  __makeOverlayHeaderTransparent() {
    this.$.headerBackground.style.opacity = '0';
    this.$.overlay.header.shadow          = false;
  }
  // toolbar is clear with no shadow until content is
  // scrolled less than 64px
  // after that, the toolbar is colored and has a shadow
  __headerThresholdTriggered(event) {
    if (this._animationBusy) { return; }
    const triggered = event.detail.value;
    if (triggered) {
      this.__colorOverlayHeader();
    }
    else {
      this.__makeOverlayHeaderTransparent();
    }
  }

  __setupAnimationElements() {
    this.style.display = 'block'; 
    this._face         = 0;    
  }


  __mobilSafariFlickerFix1() {
    this.$.overlay.header.style.display = 'none';
    this.$.overlay.classList.add('ios-fix');    
    this.__makeOverlayHeaderTransparent();
  }


  __displayHeader() {    
    this.$.overlay.header.style.display = 'block';
  }


  __clearMobilSafariFlickerFix1() {
    this.$.overlay.classList.remove('ios-fix');
  }


  __hideAddToCart(event) {
    const {disabled} = event.detail;
    this._showFab    = disabled;
    if (!disabled && !this._animationBusy) {
      this.__enterFab();
    }
    else {
      this.__closeFab();
    }
  }


  async __enterFab() {
    this.$.fab.style.display = 'block'; 
    await schedule();    
    this.$.fab.classList.remove('fab-exit');
    this.$.fab.classList.add('fab-entry');
  }


  async __closeFab() {
    if (this._animationBusy) { return; }
    this.$.fab.classList.remove('fab-entry');
    this.$.fab.classList.add('fab-exit');
    await wait(200);
    this.$.fab.style.display = 'none';
  }


  __setFocusOnQtyInput() {
    this.$.qty.focus();
  }

  // pass event detail from 'asg-shop-card-item-open-details' event
  async open(detail) {
    const {card, image, x, y} = detail;
    this._animationBusy = true;
    this.card           = undefined;
    this.card           = card;
    this.$.controls.hideActions();
    this.$.animations.init(card, image);
    await schedule();
    this.$.carousel.setupAnimationElements();
    this.__setupAnimationElements();
    this.__mobilSafariFlickerFix1();
    await this.$.animations.enter(x, y);
    await this.$.overlay.open();
    this.__displayHeader();
    this.$.set.centerIcon();
    this.$.animations.mobilSafariFlickerFix2();
    await wait(200);
    this.$.controls.enterActions();
    this.__clearMobilSafariFlickerFix1();
    await this.$.animations.finish(450);
    this.$.carousel.cleanupAfterEntryAnimation();
    await schedule();    
    this.$.carousel.enterCarouselParts();
    await wait(100);
    this.$.carousel.enterControls();
    await wait(100);
    this._animationBusy = false;
    if (!this._showFab) {
      this.__enterFab();
    }
  }


  resetCard(card) {
    this.card = card;
  }

}

window.customElements.define(ASGShopCardDetails.is, ASGShopCardDetails);
