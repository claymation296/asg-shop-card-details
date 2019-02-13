/**
 * `asg-shop-card-detail-carousel`
 * for multi-faced cards
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
  listen, 
  schedule,
  wait
}                 from '@spriteful/utils/utils.js';
import htmlString from './asg-shop-card-detail-carousel.html';
import '@spriteful/app-carousel/app-carousel.js';
import '@polymer/iron-image/iron-image.js';
import '@polymer/paper-icon-button/paper-icon-button.js';


class ASGShopCardDetailCarousel extends SpritefulElement {
  static get is() { return 'asg-shop-card-detail-carousel'; }

  static get template() {
    return html([htmlString]);
  }


  static get properties() {
    return {

      card: Object,

      layout: {
        type: String,
        value: 'small'
      },

      _carouselImages: {
        type: Array,
        computed: '__computeCarouselImages(card)'
      },
      // currently clicked image in carousel
      _clickedImg: Object,

      _dots: Object,

      _lazyCarouselImages: Array,

      _rotateBtns: {
        type: Array,
        value: () => ([])
      },

      _rotationDeg: {
        type: Number,
        value: 0
      },

      _showDots: {
        type: Boolean,
        computed: '__computeShowDots(_lazyCarouselImages)'
      }
  
    };
  }


  static get observers() {
    return [
      '__carouselImagesChanged(_carouselImages)',
      '__carouselShowDotsChanged(_showDots)'
    ];
  }


  connectedCallback() {
    super.connectedCallback();

    listen(
      this.$.carousel, 
      'carousel-lazy-load', 
      this.__lazyLoadCarouselHandler.bind(this)
    );
  }


  __computeShowDots(images) {
    if (!images) { return false; }
    return images.length > 1;
  }


  __computeBadgeHidden(index) {
    return index > 0;
  }


  __computeCarouselImages(card) {
    if (!card) { return []; }
    const {card_faces, customImages, image_uris} = card;
    const getPlaceholdersAndSrcs = uris => 
      ({placeholder: uris.small, src: uris.normal});
    const getFlatUris = 
      faces => 
        faces.map(face => 
          getPlaceholdersAndSrcs(face.image_uris));
    const getStockImgs = () => {
      if (card_faces) {
        if (image_uris) {
          const imgObj = getPlaceholdersAndSrcs(image_uris);
          return [Object.assign({}, imgObj, {rotate: true})];
        }
        else {
          return getFlatUris(card_faces);
        }
      }
      else {
        return [getPlaceholdersAndSrcs(image_uris)];
      }
    };
    const stockImgs = getStockImgs();
    if (!customImages) { return stockImgs; }
    const keys = Object.keys(customImages);
    const customImgs = keys.map(key => 
      ({placeholder: '#', src: customImages[key].url}));
    return [...stockImgs, ...customImgs];
  }


  __carouselRepeaterDomChange(event) {
    const iosIronImageBoarderRadiusFix = ironImage => {
      // safari border radius fix 9/15/2018
      // same border radius must be set on iron-image and shadow dom '#sizedImgDiv' inside it
      const imgSizedImgDiv                = this.select('#sizedImgDiv', ironImage);
      const imgPlaceholder                = this.select('#placeholder', ironImage);
      imgSizedImgDiv.style.borderRadius   = 'calc(4% + 1px)';
      imgPlaceholder.style.borderRadius   = 'calc(4% + 1px)';
      imgPlaceholder.style.overflow       = 'hidden';
      imgPlaceholder.style.backgroundClip = 'border-box';
    };
    const carouselImageEls = this.selectAll('.imgs');
    carouselImageEls.forEach(iosIronImageBoarderRadiusFix); 
    this._restOfCarouselImages = carouselImageEls.slice(1);
    this._badges               = this.selectAll('.badges');
    this._rotateBtns           = this.selectAll('.rotate-btns');
    this.enterControls();
  }


  __lazyLoadCarouselHandler(event) {
    const {currentIndex, nextIndex} = event.detail;
    if (this.card.card_faces && !this.card.image_uris) {
      // two unique faces with different palettes/images
      if (currentIndex < 2) {
        this.fire('asg-shop-card-detail-carousel-face-selected', {face: currentIndex});
      }
    }
    const lazyImagesLength = this._lazyCarouselImages.length;
    const doneLazyLoading  = nextIndex < lazyImagesLength || 
                             lazyImagesLength >= this._carouselImages.length;
    this.enterControls();
    this.__zoomOutImgAnimation();
    if (doneLazyLoading) { return; }
    const nextImg = this._carouselImages[nextIndex];
    if (!nextImg) { return; }
    this.push('_lazyCarouselImages', nextImg);
  }


  __carouselImagesChanged(images) {
    if (!images || !images.length) { 
      this._lazyCarouselImages = [];
      return;
    }
    this._lazyCarouselImages = images.slice(0, 2);
  }


  async __carouselShowDotsChanged(bool) {
    if (bool) {
      await schedule();
      this._dots = this.select('#dots-container', this.$.carousel);
      this._dots.style.transition = 
        'transform 0.5s var(--spriteful-ease, cubic-bezier(0.49, 0.01, 0, 1)), opacity 0.2s ease-in';
    }
  }


  __setImgTransform(x = 0, y = 0, sx = 1, sy = 1) {
    if (!this._clickedImg) { return; }
    this._clickedImg.style.transform = 
      `rotate(${this._rotationDeg}deg) 
       translate(${x}px, ${y}px) 
       scale(${sx}, ${sy})`;
  }


  __getWidthAndHeight(layout) {
    const aspectRatio = 0.7179;
    if (layout === 'small') {
      const width  = window.innerWidth - 16;
      const height = width / aspectRatio;
      return {width, height, aspectRatio};
    }
    const {width: w} =  this.parent.getBoundingClientRect();
    const width      = w - 16;
    const height     = width / aspectRatio;
    return {width, height, aspectRatio};
  }


  __zoomInImgAnimation(imagePos) {
    const top = 80;
    const {
      width, 
      height, 
      aspectRatio
    } = this.__getWidthAndHeight(this.layout);
    // setup inverted translate and scale
    const y  = top + ((height - imagePos.height) / 2) - imagePos.top;
    const sx = width  > 0 ? width  / imagePos.width  : imagePos.width;
    const sy = height > 0 ? height / imagePos.height : imagePos.height;
    const sidewaysHeight = width * aspectRatio;
    const sidewaysX      = top + 
                           ((imagePos.width - imagePos.height) / 2) + 
                           ((sidewaysHeight - imagePos.height) / 2) - 
                           imagePos.top;
    const sidewaysSx     = sidewaysHeight > 0 ? 
                             sidewaysHeight / imagePos.height : 
                             imagePos.height;
    const sidewaysSy     = width > 0 ? 
                             width  / imagePos.width : 
                             imagePos.width;
    const remainder180   = this._rotationDeg % 180;
    const remainder360   = this._rotationDeg % 360;
    const rightSideUp    = !remainder180 && !remainder360;
    const upsideDown     = !remainder180 && remainder360;
    const leftSideHigh   = remainder180 === 90 && remainder360 === 90;
    const rightSideHigh  = remainder180 === 90 && remainder360 === 270;
    // apply a transform that resets the element back to its orginal
    // position so that when the transform is removed, the element 
    // transitions back to its final position
    this._zoomedIn                = true;
    this._clickedImg.style.zIndex = '3';
    if (this.layout === 'small') {
      if (rightSideUp) {
        this.__setImgTransform(0, y, sx, sy);
      }
      else if (leftSideHigh) {
        this.__setImgTransform(sidewaysX, 0, sidewaysSx, sidewaysSy);
      }
      else if (upsideDown) {
        this.__setImgTransform(0, -y, sx, sy);
      }
      else if (rightSideHigh) {
        this.__setImgTransform(-sidewaysX, 0, sidewaysSx, sidewaysSy);
      }
    }
    else {
      if (rightSideUp || upsideDown ) {
        this.__setImgTransform(0, 0, sx, sy);
      }
      else if (leftSideHigh || rightSideHigh) {
        this.__setImgTransform(0, 0, sidewaysSx, sidewaysSy);
      }
    }
  }


  async __zoomOutImgAnimation() {
    if (!this._clickedImg) { return; }
    this._zoomedIn = false;
    this.__setImgTransform();
    await wait(450);  
    this._clickedImg.style.zIndex = '0';
  }


  __getImgElementFromEvent(event) {
    return event.model.children.find(child => 
      child.classList && child.classList.contains('img-wrapper')).firstElementChild;  
  }

  // fallback image on image failure
  __ironImageError(event) {
    if (event.detail.value) {
      const fallbackImgs = 
        this._lazyCarouselImages.map(() => 
          ({placeholder: '#', src: 'images/fallback.png'}));
      this.set('_lazyCarouselImages', fallbackImgs);
    }
  }


  async __imgClicked(event) {
    try { 
      await this.clicked();     
      if (this._zoomedIn) {
        this.enterControls();
        this.__zoomOutImgAnimation();
      }
      else {
        this._clickedImg = this.__getImgElementFromEvent(event);   
        const pos        = this._clickedImg.getBoundingClientRect();
        this.__exitDots();
        this.__zoomInImgAnimation(pos);
      }
    }
    catch (error) {
      if (error === 'click debounced') { return; }
      console.error(error); 
    }
  }


  async __rotateBtnClicked(event) {
    try {
      await this.clicked();
      this._clickedImg    = this.__getImgElementFromEvent(event);
      const currTransform = this._clickedImg.style.transform;
      const currDeg = currTransform ? 
        Number(currTransform.split('(')[1].split('deg')[0]) : 0;
      const getAdditionalDeg = () => {
        // dont rotate upside down if split layout
        if (this.card.layout === 'split') {
          const remainder180 = currDeg % 180;
          const remainder360 = currDeg % 360;
          if (remainder180 === 90 && remainder360 === 90) {
            return 180;
          }
          return 90;
        } 
        // dont rotate sideways if flip layout
        else if (this.card.layout === 'flip') {
          return 180;
        }
      };
      this._rotationDeg = currDeg + getAdditionalDeg();
      this._zoomedIn    = false;
      this.__setImgTransform();
    }
    catch (error) {
      if (error === 'click debounced') { return; }
      console.error(error);
    }
  }


  __exitDots() {
    if (!this._dots) { return; }
    this._dots.style.opacity   = '0';
    this._dots.style.transform = 'translateY(8px)';
  }


  __exitRotationBtns() {
    this._rotateBtns.forEach(btn => {
      btn.classList.remove('enter-rotate-btns');
    });
  }


  __enterBadges() {
    if(!this._badges) { return; }
    this._badges.forEach(badge => {
      badge.classList.add('show-badges');
    });
  }


  setupAnimationElements() {
    this.style.opacity = '0';
    this._restOfCarouselImages.forEach(el => {
      el.style.opacity = '0';
    });
    this._badges.forEach(badge => {
      badge.classList.remove('show-badges');
    });
    this._rotationDeg = 0;
    this.__setImgTransform();
    this.$.carousel.moveToSection(0);
    this.__exitDots();
  }
  

  setupBigCardBadges() {
    this.__enterBadges();
  }


  cleanupAfterEntryAnimation() {
    this.style.opacity = '1';
  }


  enterCarouselParts() {
    this._restOfCarouselImages.forEach(el => {
      el.style.opacity = '1';
    });
    this.__enterBadges();
  }


  enterControls() {
    if (this._dots) {
      this._dots.style.opacity   = '1';
      this._dots.style.transform = '';
    }
    else if (this._rotateBtns.length) {
      this._rotateBtns.forEach(btn => {
        btn.classList.add('enter-rotate-btns');
      });
    }
  }


  cleanup() {
    // reset any card zoomage
    this.__zoomOutImgAnimation();    
    this.__exitRotationBtns();
  }

}

window.customElements.define(ASGShopCardDetailCarousel.is, ASGShopCardDetailCarousel);
