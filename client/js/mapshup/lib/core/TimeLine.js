/*
 * mapshup - Webmapping made easy
 * http://mapshup.info
 *
 * Copyright Jérôme Gasperi, 2011.12.08
 *
 * jerome[dot]gasperi[at]gmail[dot]com
 *
 * This software is a computer program whose purpose is a webmapping application
 * to display and manipulate geographical data.
 *
 * This software is governed by the CeCILL-B license under French law and
 * abiding by the rules of distribution of free software.  You can  use,
 * modify and/ or redistribute the software under the terms of the CeCILL-B
 * license as circulated by CEA, CNRS and INRIA at the following URL
 * "http://www.cecill.info".
 *
 * As a counterpart to the access to the source code and  rights to copy,
 * modify and redistribute granted by the license, users are provided only
 * with a limited warranty  and the software's author,  the holder of the
 * economic rights,  and the successive licensors  have only  limited
 * liability.
 *
 * In this respect, the user's attention is drawn to the risks associated
 * with loading,  using,  modifying and/or developing or reproducing the
 * software by the user in light of its specific status of free software,
 * that may mean  that it is complicated to manipulate,  and  that  also
 * therefore means  that it is reserved for developers  and  experienced
 * professionals having in-depth computer knowledge. Users are therefore
 * encouraged to load and test the software's suitability as regards their
 * requirements in conditions enabling the security of their systems and/or
 * data to be ensured and,  more generally, to use and operate it in the
 * same conditions as regards security.
 *
 * The fact that you are presently reading this means that you have had
 * knowledge of the CeCILL-B license and that you accept its terms.
 */

/**
 * mapshup TimeLIne object
 */
(function(msp) {
    
    
    /*
     * @input boolean b : true to enable timeLine - false otherwise
     */
    msp.TimeLine = function(b) {
        
        /*
         * Only one TimeLine object instance is created
         */
        if (msp.TimeLine._o) {
            return msp.TimeLine._o;
        }
        
        /*
         * Oldest date
         */
        this.min = new Date(2000,0,1);
        
        /*
         * Newest date
         */
        this.max = new Date();
        
        /*
         * True if initialized
         */
        this.isLoaded = false;
        
        /*
         * Registered items
         * Structure :
         * {
         *      sync://boolean true if layer is synchronised 
         *      layer: // layer reference
         * }
         */
        this.items = [];
        
        /*
         * True to enable time slider. False otherwise
         */
        this.enabled = true;
        
        /*
         * True to automatically refresh all registered layers
         * when dates change
         */
        this.autoRefresh = true;
        
        /*
         * Initialize TimeLine 
         * TimeLine is located immediatly below mapshup header
         * 
         * @input b : boolean - true to enable timeLine - false otherwise
         */
        this.init = function(b) {
            
            var self = this;
            
            /*
             * No timeLine
             */
            if (!b) {
                return false;
            }
            
            /*
             * Create timeLine object
             * 
             * <div id="timeLine">
             *      <div class="timeLine"></div>
             *      <div class="tools"></div>
             * </div>
             * 
             */
            self.$d = msp.Util.$$('#timeLine', $('#mwrapper')).html('<div class="timeLine"><div class="mask"><h2>'+msp.Util._("Date filter disabled")+'</h2>('+msp.Util._("Click to enable")+')</div></div>')
            
            /*
             * Create actions Toolbar
             */
            self.tb = new msp.Toolbar({
                parent:$(self.$d), 
                classes:'tools'
            });
            /*
            self.tb.add({
                id:msp.Util.getId(),
                icon:msp.Util.getImgUrl("refresh.png"),
                tt:msp.Util._("Refresh layers"),
                activable:false,
                switchable:false,
                callback:function() {
                    self.refresh();
                }
            });
            */
            self.tb.add({
                id:msp.Util.getId(),
                icon:msp.Util.getImgUrl("disable.png"),
                tt:msp.Util._("Disable date filter"),
                activable:false,
                switchable:false,
                callback:function() {
                    self.enable(false);
                }
            });
            
            /*
             * Set a trigger on visibility mask
             */
            $('.mask', self.$d).click(function(e){
                e.preventDefault();
                e.stopPropagation();
                self.enable(true);
            });
                
            
            /*
             * Set timeLine reference
             */
            self.$timeLine = $('.timeLine', self.$d);
            
            /*
             * Compute size
             */
            self.resize(self);
            
            /*
             * Set time slider
             */
            self.$timeLine.dateRangeSlider({
                wheelMode:"scroll",
                valueLabels:"change",
                bounds:{
                    min:new Date(2000,0,1),
                    max:new Date()
                }
            });
            
            /*
             * Register event on date changes
             */
            self.$d.bind("valuesChanging", function(event, ui) {
                
                /*
                 * Continuing store date changes
                 */
                self.min = ui.values.min;
                self.max = ui.values.max;
                
            }).bind("valuesChanged", function(event, ui) {
                
                /*
                 * Propagate date changes to layers
                 */
                self.setTime(self.getInterval());
                
            });
            
            /*
             * Move map object
             */
            $('.map').css({
                'top':$('.map').offset().top + self.$d.height()
            });
        
            /*
             * Recompute size when window is resized
             */
            msp.events.register("resizeend", self, self.resize);
            
            return true;
            
        };
        
        /*
         * Recompute size when window is resized
         */
        this.resize = function(scope) {
            scope.$timeLine.css({
                width:(100 - (100.0 * 80 / msp.$map.width()))+'%'
            });
        };
        
        /*
         * Attach a layer to the timeLine
         */
        this.add = function(layer) {
            
            var i, l, t, self = this;
            
            if (!self.enabled) {
                return false;
            }
            
            /*
             * Paranoid mode
             */
            if (!layer || !layer['_msp']) {
                return false;
            }
            
            t = msp.Map.layerTypes[layer['_msp'].layerDescription.type];
            
            /*
             * If layerType support setTime function
             * then the layer can be added to the timeLine
             */
            if (t && $.isFunction(t.setTime)) {
                for (i = 0, l = self.items.length; i < l; i++) {
                    if (self.items[i].id === layer.id) {
                        return false;
                    }
                }
                self.items.push({
                    layer:layer,
                    upToDate:false
                });
                
                return true;
            }
            
            return false;
            
        };
        
        /*
         * Return time interval in ISO 8601
         * 
         * @return interval : array of 2 ISO 8601 dates
         *                    i.e. [YYYY-MM-DDTHH:mm:ss, YYYY-MM-DDTHH:mm:ss]
         */
        this.getInterval = function() {
            var self = this;
            return self.enabled ? [self.toISO8601(self.min), self.toISO8601(self.max)] : ['',''];
        };
        
        /*
         * Unattach a layer to the timeLine
         */
        this.remove = function (layer) {
            for (var i = 0, l = this.items.length; i < l; i++) {
                if (this.items[i].layer.id === layer.id) {
                    this.items.splice(i,1);
                    break;
                }
            }
        };
        
        /*
         * Enable/disable date filters
         */
        this.enable = function(b) {
            
            var self = this;
            
            self.enabled = b;
            
            if (b) {
                $('.mask', self.$d).hide();
            }
            else {
                $('.mask', self.$d).show();
                
                self.setTime(null);
                
            }
            
        };
        
        /*
         * Update time filter for catalog layers
         */
        this.setTime = function(interval) {
        
            var i, l, item;
            
            for (i = 0, l = this.items.length; i < l; i++) {
                item = this.items[i];
                
                /*
                 * Hidden layer are not updated !!!
                 */
                if (item.layer.getVisibility()) {
                    msp.Map.layerTypes[item.layer["_msp"].layerDescription.type].setTime(item.layer, interval);
                    item.upToDate = true;
                }
                else {
                    item.upToDate = false;
                }
                
            }
            
        };
        
        /*
         * Transform a date into an ISO8601 representation
         */
        this.toISO8601 = function(date) {
            
            var m = "" + (date.getMonth() + 1),
            d = "" + date.getDate();
            
            /*
             * Pad to 2 digits
             */
            if (d.length === 1) {
                d = "0" + d;
            }
            if (m.length === 1) {
                m = "0" + m;
            }
            return date.getFullYear() + "-" + m + "-" + d + "T00:00:00";
            
        };
        
        
        /* 
         * Initialize object
         */
        this.init(b);
        
        /*
         * Create unique instance
         */
        msp.TimeLine._o = this;
        
        /*
         * Initialize object
         */
        return this;
        
    }
    
})(window.msp);