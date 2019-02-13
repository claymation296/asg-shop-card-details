/**
 * `asg-shop-card-detail-animations`
 * ripple animation sequence
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
  getRootTarget,
  schedule,
  wait
}                 from '@spriteful/utils/utils.js';
import htmlString from './asg-shop-card-detail-animations.html';
import '@polymer/iron-image/iron-image.js';


class ASGShopCardDetailAnimations extends SpritefulElement {
  static get is() { return 'asg-shop-card-detail-animations'; }

  static get template() {
    return html([htmlString]);
  }


  static get properties() {
    return {

      _card: Object,

      _cardImgBounceClass: {
        type: String,
        value: ''
      }

    };
  }


  connectedCallback() {
    super.connectedCallback();
    // safari border radius fix 9/15/2018
    // same border radius must be set on iron-image and shadow dom '#sizedImgDiv' inside it
    const imgSizedImgDiv                = this.select('#sizedImgDiv', this.$.img);
    const imgPlaceholder                = this.select('#placeholder', this.$.img);
    imgSizedImgDiv.style.borderRadius   = 'calc(4% + 1px)';
    imgPlaceholder.style.borderRadius   = 'calc(4% + 1px)';
    imgPlaceholder.style.overflow       = 'hidden';
    imgPlaceholder.style.backgroundClip = 'border-box';
  }


  __computePlaceholder(card) {
    if (!card) { return '#'; }
    const {card_faces, image_uris} = card;
    return card_faces && !image_uris ? 
             card_faces[0].image_uris.small : 
             image_uris.small;
  }


  __computeSrc(card) {
    if (!card) { return '#'; }
    const {card_faces, image_uris} = card;
    return card_faces && !image_uris ? 
             card_faces[0].image_uris.normal : 
             image_uris.normal;
  }

  // fallback image on image failure
  __ironImageError(event) {
    if (event.detail.value) {
      this.$.img.placeholder = '#';
      this.$.img.src         = 'images/fallback.png';
    }
  }


  __initCardImgAnimation(imagePos) {
    // hard coded values allow animation to happen before
    // the first opportunity to take these measurements dynamically
    const left   = 64;
    const top    = 96;
    const width  = window.innerWidth - 128;
    const height = width / 0.7179;    
    // setup inverted translate and scale
    const x  = imagePos.left - left;
    const y  = imagePos.top  - top;
    const sx = width  > 0 ? imagePos.width  / width  : imagePos.width;
    const sy = height > 0 ? imagePos.height / height : imagePos.height;
    const midImg     = top + (height / 2);
    const noMansZone = midImg * 0.03;
    const bounceDown = imagePos.bottom < (midImg - noMansZone);
    const bounceUp   = imagePos.top > (midImg + noMansZone);
    if (this._cardImgBounceClass) {
      this.$.imgContainer.classList.remove(this._cardImgBounceClass);
    }
    if (bounceDown) {
      this._cardImgBounceClass = 'bounceInDown';
    } 
    else if (bounceUp) {
      this._cardImgBounceClass = 'bounceInUp';
    } 
    else {
      this._cardImgBounceClass = 'bounceInLeft';
    }
    // apply a transform that resets the element back to its orginal
    // position so that when the transform is removed, the element 
    // transitions back to its final position
    this.$.imgContainer.style.transition = 'none';
    this.$.imgContainer.style.transform  = `translateY(${y}px)`;
    this.$.img.style.transition          = 'none';
    this.$.img.style.transform           = `translateX(${x}px) scale(${sx}, ${sy})`;
    return {imgX: left + (width / 2), imgY: top + (height / 2)};
  }


  __cardImgTransistionend(event) {
    if (getRootTarget(event) !== this.$.imgContainer) { return; }
    this.$.imgContainer.style.transition = 'unset';
    if (this._cardImgBounceClass) {
      this.$.imgContainer.classList.add(this._cardImgBounceClass);
    }
  }
  

  init(card, image) {
    this._card              = card;
    this._finalImgCenterPos = this.__initCardImgAnimation(image);
  }


  __setupAnimationElements() {
    this.$.animationOverlay.style.display    = 'block';
    this.$.animationOverlay.style.transition = 'opacity 0.2s ease-in';
    this.$.animationOverlay.style.opacity    = '0';
    this.$.imgRipple.classList.remove('fade-out-ripple');
    this.$.clickRipple.classList.remove('fade-out-ripple');
    if (this._cardImgBounceClass) {
      this.$.imgContainer.classList.remove(this._cardImgBounceClass);
    }
  }


  async __playClickRipple(x, y, covers) {
    this.$.clickRipple.style.left = `calc(${x}px - 125vmax)`;
    this.$.clickRipple.style.top  = `calc(${y}px - 125vmax)`;
    if (covers) {
      this.$.clickRipple.classList.add('ripple-covers');
      this.$.imgContainer.style.display = 'none';
    }
    else {
      this.$.clickRipple.classList.remove('ripple-covers');
      this.$.imgContainer.style.display = 'flex';
    }
    this.__setupAnimationElements();
    await schedule();    
    this.$.animationOverlay.style.opacity = '1';
    this.$.clickRipple.classList.add('explode-ripple');
  }


  __playCardImgAnimation() {
    this.$.imgContainer.style.transition = 'transform 0.2s ease-in';
    this.$.imgContainer.style.transform  = '';
    this.$.img.style.transition          = 'transform 0.2s ease-out';
    this.$.img.style.transform           = '';
  }


  async __playImgRipple() {
    const {imgX, imgY}          = this._finalImgCenterPos;
    this.$.imgRipple.style.left = `calc(${imgX}px - 125vmax)`;
    this.$.imgRipple.style.top  = `calc(${imgY}px - 125vmax)`;
    await schedule();
    this.$.imgRipple.classList.add('explode-ripple');
  }

  // a brief flicker of this element 
  mobilSafariFlickerFix2() {
    this.$.clickRipple.classList.add('fade-out-ripple');
  }


  __fadeOutRipples() {
    this.$.imgRipple.classList.add('fade-out-ripple');
    this.$.clickRipple.classList.add('fade-out-ripple');
    this.$.clickRipple.classList.add('fade-out-ripple-transition');
  }


  __cleanupAfterEntryAnimation() {    
    this.$.animationOverlay.style.transition = 'none';
    this.$.animationOverlay.style.opacity    = '0';
    this.$.animationOverlay.style.display    = 'none';
    this.$.clickRipple.classList.remove('explode-ripple'); 
    this.$.clickRipple.classList.remove('fade-out-ripple-transition');   
    this.$.imgRipple.classList.remove('explode-ripple');
  }


  async enter(x, y) {
    await this.__playClickRipple(x, y);
    await wait(200);
    this.__playCardImgAnimation();
    await wait(75);
    await this.__playImgRipple();    
    return wait(300);
  }


  async exit(x, y) {
    await this.__playClickRipple(x, y, 'covers');
    return wait(600);
  }


  async finish(time) {
    this.__fadeOutRipples();
    await wait(time);
    this.__cleanupAfterEntryAnimation();
  }

}

window.customElements.define(ASGShopCardDetailAnimations.is, ASGShopCardDetailAnimations);
