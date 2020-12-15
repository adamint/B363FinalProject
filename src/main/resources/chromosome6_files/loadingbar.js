/*  
    Name: LOADING BAR  
    Description: Creates a simple loading bar on the page that can show download status with pause/resume feature.
    Date: 12/23/2008
    Updated Date: 01/07/2008
    Author: Eric Pascarello
    
    Requires: utils.js, notify.js, fixedbar.css

    Notes:
    
        //Below is the basic usage showing how to create an instance
    
            //Create new instance
            var myBar = new LoadingBar();
        
            //Optional - set custom notification names - You need to override them if you use it more than once on a page!
            //myBar.listenerEventNames.UPDATE = "I_LIKE_JAVASCRIPT";
            
            //Optional - set image path
            //myBar.statusImgs.annimationImgPath = "images/crazyFrog.gif";
            
            //Optional - Change Any of the text parameters [titleBarText, buttonText, statusText]
            //myBar.titleBarText.LOADING = "LOADING THIS HUGE FILE";
        
            //render it to the page
            myBar.init();
                
            //Example Notification: Update Status       
            function exampleStatus( dLen ){
                var progressData = {
                    "dataLength": dLen
                };
                var notifier = Notifier.getInstance();
                notifier.Notify(null, "CONTENT_LOADER_UPDATE", progressData);
            }
        
       //Examples on how to update the status bar through notifications 
        
            //Example Notification: Download complete
            function exampleFinish(){
                var notifier = Notifier.getInstance();
                notifier.Notify(null, "CONTENT_LOADER_FINISHED", {});
            }
        
        
            //Example Notification: Error        
            function exampleError(){
                var errorData = { 
                     //If properties are not set, the default will be used
                    "message" : "Error loading the document.<br/>Try loading again.",  //Default : Error loading data
                    "btnText" : "Reload Page", //Default : Reload
                    "action" : function(){ window.location.reload(); } //Default: refresh page
                });
                var notifier = Notifier.getInstance();
                notifier.Notify(null, "CONTENT_LOADER_ERROR", errorData);
            }
            
       //Examples on interacting with the Stop/Start Button is pushed
            
            function exampleSetUpListeners(){

                function exampleStart(){
                    alert("start button!");
                }
                function exampleStop(){
                    alert("stop button!");
                }
            
                var notifier = Notifier.getInstance();
                notifier.setListener(null, "LOADER_START", exampleStart );
                notifier.setListener(null, "LOADER_STOP", exampleEnd );  
           }
*/

var LoadingBar = function() {

    this.listenerEventNames = {
        "UPDATE": "CONTENT_LOADER_UPDATE",
        "FINISHED": "CONTENT_LOADER_FINISHED",
        "ERROR": "CONTENT_LOADER_ERROR",
        "CANCEL" : "CONTENT_LOADER_CANCELED"
    };
    
    this.sPath = window.location.protocol + "//" + window.location.host;

    
    this.statusImgs = {
        "annimationImgPath" : this.sPath + "/core/ajax_loader/1.0/img/ani.gif",
        "errorImgPath" : this.sPath + "/core/ajax_loader/1.0/img/erroricon.gif"    
    };

    this.statusImgsAlt = {
        "annimationImg" : "loading image",
        "errorImg" : "error image"    
    };
    

    this.broadcastEventNames = {
        "STOP": "LOADER_STOP",
        "START": "LOADER_START",
        "CANCELED": "LOADER_CANCELED"
    };
    
    this.titleBarText = {
        "LOADING" : "Downloading",
        "PAUSED" : "Paused",
        "ERROR" : "Error",
        "COMPLETE" : "COMPLETE"
    };
    
    this.buttonText = {
        "RESUME" : "Resume",
        "PAUSE" : "Pause",
        "RELOAD" : "Reload",
        "CANCEL" : "Cancel",
        "DONE" : "Done"
    };
    
    this.buttonImgs = {
        "RESUME" : this.sPath + "/core/icons/control_play_blue.gif",
        "PAUSE" : this.sPath + "/core/icons/control_pause_blue.gif",
        "RELOAD" : this.sPath + "/core/icons/control_repeat_blue.gif",
        "CANCEL" : this.sPath + "/core/icons/cross.gif",
        "DONE" : this.sPath + "/core/icons/tick.gif"
    };
    
    this.statusText = {
        "ERROR": "Error loading document. Reload page to try again.",
        "DOWNLOAD_PRE" : "Downloading Large Sequence: ",
        "DOWNLOAD_SFX" : "MB"        
    };
   
};

LoadingBar.prototype = {

    init: function() {

        //Grab instance of the notifier
        this.notifier = Notifier.getInstance();

        //set defaults
        this.btnState = true;
        this._isCanceled = false;

        //Start to build the control and register event listeners
        this._buildBar();
        this._registerButton();
        this._registerNotifierListeners();

    },

    //Mehtod used to ease making elements - should be a util!
    _createElement: function(tagName, att) {
        var elem = document.createElement(tagName);
        for (var prop in att) {
            if (prop === "className") {
                elem.className = att[prop];
            } else if (prop === "innerHTML") {
                elem.innerHTML = att[prop];
            } else {
                elem.setAttribute(prop, att[prop]);
            }
        }
        return elem;
    },

    //Method to make it easier to append multiple children to a parent in one declaration
    _appendChildren: function() {
        var argsLen = arguments.length;
        var elem = arguments[0];
        for (var i = 1; i < argsLen; i++) {
            elem.appendChild(arguments[i]);
        }
    },

    //Builds the visual display
    _buildBar: function() {

        //Create the elements of the control
        this.display = {

            //The parent element
            wrapper: this._createElement("div", {
                "className": "fixedbox"
            }),


            aniImg: this._createElement("img", {
                "src": this.statusImgs.annimationImgPath,
                "alt": this.statusImgsAlt.annimationImg,
                "className": "loadingbar_ani_image"
            }),
            
           

            //Status Text
            updateText: this._createElement("span", {
                "innerHTML": this.statusText.DOWNLOAD_PRE + "0" + this.statusText.DOWNLOAD_SFX,
                "className": "loadingbar_update_text"
            }),

            //Paused Text
            pausedText: this._createElement("span", {
                "innerHTML": "",
                "className": "loadingbar_paused_text"
            }),


            //Stop Resume Buttons
            btnHolder: this._createElement("div", {
                "className" : "loadingbar_btn_holder"
            }),
            btnStop: this._createElement("button", {}),
            btnStopText : document.createTextNode( this.buttonText.PAUSE ),
            btnStopImg: this._createElement("img", {
                "src": this.buttonImgs.PAUSE,
                "alt": this.buttonText.PAUSE + " image"
            }),
            btnCancel: this._createElement("button", {}),
            btnCancelText : document.createTextNode( this.buttonText.CANCEL ),
            btnCancelImg: this._createElement("img", {
                "src": this.buttonImgs.CANCEL,
                "alt": this.buttonText.CANCEL + " image"
            }),
            

            //Error Message
            errorHolder: this._createElement("div", {
                "className": "loadingbar_error"
            }),
            errorText: this._createElement("span", {
                "innerHTML": this.titleBarText.ERROR
            }),
            errorBtn: this._createElement("button", {}),           
            errorBtnText : document.createTextNode( this.buttonText.RELOAD ),
            errorBtnImg: this._createElement("img", {
                "src": this.buttonImgs.RELOAD,
                "alt": this.buttonText.RELOAD + " image"
            }),
            errorBtnDone: this._createElement("button", {}),
            errorBtnDoneText : document.createTextNode( this.buttonText.DONE ),
            errorBtnDoneImg: this._createElement("img", {
                "src": this.buttonImgs.DONE,
                "alt": this.buttonText.DONE + " image"
            })
            

            


        };

        //Store reference for quicker look-ups
        var d = this.display;

        //Set up the buttons with the img and text
        this._appendChildren(d.btnCancel, d.btnCancelImg, d.btnCancelText);
        this._appendChildren(d.btnStop, d.btnStopImg, d.btnStopText); 
        this._appendChildren(d.errorBtn, d.errorBtnImg, d.errorBtnText);
        this._appendChildren(d.errorBtnDone, d.errorBtnDoneImg, d.errorBtnDoneText);       

        //Create the building blocks of the control        
        this._appendChildren(d.btnHolder, d.btnStop, d.btnCancel);     //stop/resume button
        this._appendChildren(d.errorHolder, d.errorBtnDone, d.errorBtn, d.errorText );  //error bar
        
        //Join the blocks together to 
        this._appendChildren(d.wrapper, d.btnHolder, d.errorHolder, d.aniImg, d.updateText, d.pausedText );

        //Add the control to our document
        this._appendChildren(document.body, d.wrapper);

    },

    //Registers the button onclick event
    _registerButton: function() {

        var ref = this;
        this.display.btnStop.onclick = function() {
            ref._handleBtnClick();
        };
        this.display.btnCancel.onclick = function() {
            ref._cancelLoad();
        };       
    },

    //Create the listeners that tell the status bar to update its state
    _registerNotifierListeners: function() {

        var ref = this;        
        var eNames = this.listenerEventNames;        

        //Create Listener that handles the process updates
        this.notifier.setListener(null, eNames.UPDATE,
        function() {
            ref._updateStatus.apply(ref, arguments);
        });

        //Create Listener that handles when the process is complete
        this.notifier.setListener(null, eNames.FINISHED,
        function() {
            ref._completeStatus.apply(ref, arguments);
        });
        
        //Create listener when the process encounters an error
        this.notifier.setListener(null, eNames.ERROR,
        function() {
            ref._showError.apply(ref, arguments);
        });
        
        //Create listener when the process encounters canceled request
        this.notifier.setListener(null, eNames.CANCEL,
        function() {
            ref._cancelLoad.apply(ref, arguments);
        });
        
    },

    //Called when the Stop/Pause button is clicked
    _handleBtnClick: function() {
    
        var bName = this.broadcastEventNames;

        //Default state of the button
        var val = this.buttonText.RESUME;        //text to display
        var img = this.buttonImgs.RESUME;        //text to display
        
        var notifyState = bName.STOP;   //message to broadcast

        //If button is disabled
        if (!this.btnState) {
            val = this.buttonText.PAUSE;
            img = this.buttonImgs.PAUSE;
            notifyState = bName.START;
        }

        //Swap the state of the button
        this.btnState = !this.btnState;

        //Update the display with the new values
        var d = this.display;
        
        //d.btnStop.value = val;
        var btnText = document.createTextNode( val );
        var btnImg = this._createElement("img", {"src" : img });
        d.btnStop.innerHTML = "";
        d.btnStop.alt = btnText + " image";
        this._appendChildren(d.btnStop, btnImg, btnText);
        
        d.aniImg.style.visibility = (this.btnState) ? "visible": "hidden";        
        d.pausedText.innerHTML = (this.btnState) ? "" : "(" + this.titleBarText.PAUSED + ")";

        //Send out the notification
        this.notifier.Notify(null, notifyState);

    },

    //Called by the notification  listener CONTENT_LOADER_UPDATE
    _updateStatus: function() {

        //set the display to show how much data was fetched
        var dataLength = (Math.floor(arguments[1].dataLength * 100) / 100).toFixed(2);
        this.display.updateText.innerHTML = this.statusText.DOWNLOAD_PRE + dataLength + this.statusText.DOWNLOAD_SFX;

    },

    //Called by the notifaction listener CONTENT_LOADER_FINISHED
    _completeStatus: function() {

        //Update the display to inform user it is done!
        var d = this.display;
        d.aniImg.style.visibility = "hidden";
        d.pausedText.innerHTML = " (" + this.titleBarText.COMPLETE + ")";
        d.btnHolder.style.visibility = "hidden";
        d.wrapper.className += " fixedboxComplete";

        //hide the contorl
        this._removeBar(2000);
        
    },
    
    _cancelLoad : function(){
        if(!this._isCanceled){
            this._isCanceled = true;
            this.notifier.Notify(null, this.broadcastEventNames.CANCELED);
            this._removeBar( 1 );
        }        
    },

    //Called when _completeStatus is called. Hides the visual display from the view. 
    _removeBar: function( ms ) {
    
        //get pause amount before hiding
        ms = ms || 1000;
        
        var ref = this; 
        function hideBar() {
            ref.fadeOut(ref.display.wrapper);
        }
        
        //Give the user a short peroid of time to see the complete message
        window.setTimeout(hideBar, ms);
        
        
        
    },
    
    fadeOut: function( ele ) {
        var ref = this;
    	var myOpacity = (function(){ 
    		if(ele.filter)
    		{ return function(val){ ele.style.filters = 'alpha(opacity=' + val + ')'; } }
    		else { return function(val){ ele.style.opacity = val/100; } }
    		})();
    	var setOpacity = myOpacity;
    	ele.zoom = 1; //ie can't do opacity well without layout
    	setOpacity( 100 );
    	for(var i=0; i<=100; i+= 5)
    	{
    		(function(){
    			var num = 100 * Math.sin(i/100 * (Math.PI/2));
    			setTimeout(function(){
    				setOpacity( 100 - num ); 
    				if( num == 100 )
    				{
    				    ele.style.display = "none";
    				    ref.cleanUp();
    				}
    			}, num*4 );
    		})();
    	}
    },
    
    
    cleanUp : function(){
    
        //Need to delete things, but that will cause some issues with the Notify
        
        //Destroy objects taking up memory
        for(var x in this.listenerEventsNames){        
            this.notifier.oQuee[ this.listenerEventsNames[x] ] = {};
            delete this.notifier.oQuee[ this.listenerEventsNames[x] ];
        }
                        
        this.display.wrapper.style.visibility = "hidden";

        function removeAllChildren(field){
            if ( field.hasChildNodes() ){
                while ( field.childNodes.length >= 1 ){
                    removeAllChildren(field.firstChild);
                    field.removeChild(field.firstChild);
                }
            }
        }
        
        removeAllChildren(this.display.wrapper);
        
    },

    //Called by the notifaction listener CONTENT_LOADER_ERROR
    _showError: function() {

        //Show and hide the controls needed to show the error message
        var d = this.display;
        
        //change the CSS of the wrapper element so it is highlighted red
        d.wrapper.className += " fixedboxError";

        //d.titleText.innerHTML = this.titleBarText.ERROR;
        //d.aniImg.style.visibility = "hidden";
        d.aniImg.src = this.statusImgs.errorImgPath;
        d.aniImg.alt = this.statusImgsAlt.errorImg;
        d.btnHolder.style.display = "none";
        d.errorHolder.style.display = "block";
        
        //Set the text sent in from the notification message
        d.errorText.innerHTML = arguments[1].message || this.statusText.ERROR;
        d.errorBtn.value = arguments[1].btnText || this.buttonText.RELOAD;
        d.errorBtn.onclick = arguments[1].action ||
            function() {
                window.location.reload(true);
            };
        var ref = this;
        d.errorBtnDone.onclick = arguments[1].action ||
            function() {
                ref._removeBar( 1 );
            }

    }

};
