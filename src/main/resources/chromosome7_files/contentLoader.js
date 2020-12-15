/*  
    Name: Content Loader  
    Description: Allows for data to be adding to the page in a chunked manner using an Ajax call.

    Requires: utils.js, notify.js, fe_xmlhttp.js

    Notes:
    
        //Below is the basic usage showing how to create an instance
        
            var outputLocation = "aDivId"; //This can be an object reference [document.getElementById("foo")] or a string [as shown]
            var urlToFetch = "http://intrawebdev.be-md.ncbi.nlm.nih.gov:6224/staff/pascaree/chunked/data/sequences2.txt"; //a valid http URL of the file to load
        
            //create our instance        
            var myCL = new ContentLoader( outputLocation, urlToFetch )
        
            //Optional- set custom notification names - You need to override them if you use it more than once on a page!
            //myCL.broadcastEventNames.UPDATE = "I_LIKE_JAVASCRIPT";
        
            //Optional - set alternate processing cgi - If you are not using the default one
            //cl.sUrl = "http://intrawebdev.be-md.ncbi.nlm.nih.gov/staff/pascaree/chunked/b_error.cgi"         
            
            //Optional - set an alternative message that is appeneded to the end of the download stream when the user cancels the request.
            //this.cancelMessage = "The download has been canceled. To restart the download, refresh the page.";
    
            //Optional - set an alternative type of element that the retrieved content gets inserted into
            //this.outerElemType = "span";
            //this.innerElemType = "span";
            
            //Start the fetching of the file!
            cl.startFetch();  
        

       //Stoping and Restarting the Downloading and Rendering
        
            //Example Notification: Stop Loading        
            function exampleStop(){
                var notifier = Notifier.getInstance();
                notifier.Notify(null, "LOADER_STOP", {} );
            }
            
            //Example Notification: Resume Loading        
            function exampleStop(){
                var notifier = Notifier.getInstance();
                notifier.Notify(null, "LOADER_START", {} );
            }            
            
                             
      //Working with the broadcasted events
      
            function exampleSetUpListeners(){

                function exampleUpdate(){
                    alert("example Update!" + arguments[1].dataLength );
                }

                function exampleFinished(){
                    alert("exampleFinished!" + arguments[1].dataLength );
                }

                function exampleError(){
                    alert("exampleError!" + arguments[1].message ); //properties [String message,String btnText,Function action] 
                }

                function examplePaused(){
                    alert("example Paused!");
                }

                function exampleStarted(){
                    alert("example Started!");
                }
            
                var notifier = Notifier.getInstance();
                notifier.setListener(null, "CONTENT_LOADER_UPDATE", exampleUpdate );
                notifier.setListener(null, "CONTENT_LOADER_FINISHED", exampleFinished );
                notifier.setListener(null, "CONTENT_LOADER_ERROR", exampleError );
                notifier.setListener(null, "CONTENT_LOADER_PAUSED", examplePaused );
                notifier.setListener(null, "CONTENT_LOADER_STARTED", exampleStarted );

           }      
    
*/


var ContentLoader = function(output, urlToFetch) {

    //the service that spits out the chunks
    this.sUrl = window.location.protocol + "//" + window.location.host + "/portal/loader/pload.cgi";

    //the service to clean up the data
    this.cleanUpUrl = this.sUrl; 

    //Where the chunks are to be outputted on the page
    this.outputElem = (typeof output === "string") ? document.getElementById(output) : output;
    
    //Listener Values - Can be overridden so you can have more than one control on page
    this.listenerEventsNames = {
        "STOP": "LOADER_STOP",
        "START": "LOADER_START",
        "CANCEL":"LOADER_CANCELED"
    };

    //Broadcast Values - Can be overridden so you can have more than one control on page
    this.broadcastEventNames = {
        "UPDATE": "CONTENT_LOADER_UPDATE",
        "FINISHED": "CONTENT_LOADER_FINISHED",
        "ERROR": "CONTENT_LOADER_ERROR",
        "PAUSED": "CONTENT_LOADER_PAUSED",
        "STARTED": "CONTENT_LOADER_STARTED",
        "CANCEL":"CONTENT_LOADER_CANCELED"        
    };
    
    //Message that is appeneded to the end of the download stream when the user cancels the request.
    this.cancelMessage = "The download has been canceled. To restart the download, refresh the page.";
    
    //Type of element that the retrieved content gets inserted into
    this.outerElemType = "div";
    this.innerElemType = "pre";
  
    //Privates - No need to touch
       
    //Store the total of all the content-lengths fetched.
    this._dataLoadedLength = 0;
    //Store the responseText - does not check for pid order! [no need with this single request setup]
    this._renderQueue = [];
    //Boolean that lets us know if we are paused/running
    this._isRunning = false;
    //Boolean that lets us know if the entire document is fetched.
    this._isCompleted = false;
    //Boolean that lets us know if the fetching has been canceled.
    this._isCanceled = false;
    //Stores an instance of the notifier to broadcast updates
    this._notifier = Notifier.getInstance();
    //Boolean that lets us know id the seup-up has been run
    this._hasInitRun = false;
    
    //retry for serverside slow rendering
    this._retryCount = 0;
    //Maximum Number of retries
    this.retryMaximumCount = 5;
    //Pause time between retries
    this.retryPauseTime = 300;  //milliseconds
   
   //Page one delay [Gives server time to render first BIG chunk - eliminates extra retry attempts]
   this.pageOneDelay = 500; //milliseconds
   //Other Delay
   this.pageNormalDelay = 1; //Minimum of 1 second needed to clean up GC w/ IE
   
    
    //Make sure we have an absolute path
    if(urlToFetch.indexOf("http") !== 0){
      var slash = (urlToFetch.charAt(0) === "/")?"":"/";
      urlToFetch = window.location.protocol + "//" + window.location.host + slash + urlToFetch;
    }
    
    // data that pertains to the request
    this._data = {
        "curl": encodeURIComponent(urlToFetch), // URL FETCHING          
        "dsrc": null,                           // "Session" id
        "oid": null,                            // Object Id
        "pid": 0                                // content url
    };
        
};


ContentLoader.prototype = {

    //PUBLIC METHODS
    startFetch : function(){ 
        
        if(!this._hasInitRun){
            this._registerNotifierListeners();
        }
        
        this._hasInitRun = true;
        this.resumeFetch();

    },
    

    //Call this to start fetching of data
    resumeFetch: function() { 
        
        //Make sure we are not already running
        if(this._isRunning || this._isCompleted || this._isCanceled){
            return;
        }
        
        //Set our Boolean and broadcast a STARTED message
        this._isRunning = true;
        this._notifier.Notify(null, this.broadcastEventNames.STARTED, {});
        
        //Start the fetching
        this._fetchChunk();
        
    },

    //Call to pause the fecthing [The Ajax call is NOT aborted]
    pauseFetch: function() { 
        //Make sure we are not already PAUSED
        if(!this._isRunning){
            return;
        }
        
        //Set our Boolean and broadcast a PAUSED message
        this._isRunning = false;
        this._notifier.Notify(null, this.broadcastEventNames.PAUSED, {});
        
    },
    
    //Call to cancel the fecthing
    cancelFetch: function() { 
        
        //See if we are already canceled the request
        if(this._isCanceled && !this._isRunning){
          //If we are, we do not need to do anything
          return;
        }
        
        //Set our Boolean and broadcast a CANCEL message
        this._isRunning = false;
        this._isCanceled = true;
        this._notifier.Notify(null, this.broadcastEventNames.CANCEL, {});
        
                
        //Make sure we have an oid from the server!        
        if(this._data.oid === null) return;

        //SEND AJAX CALL TO SERVER TO KILL REQUEST!
        
        var ref = this;
        //Called when we do not get a 200 status
        var failLoad = function(obj) {
            ref.cleanUp( true );            
        };

        //Called when we get a 200 status
        var passLoad = function(obj) {
            ref.cleanUp( true );
        };

        //Set up the Ajax Call
        var test_rdp = new RemoteDataProvider(this.cleanUpUrl);
        test_rdp.onSuccess = passLoad;
        test_rdp.onError = failLoad;        
        var qs ="?cancel=" + this._data.oid + "&dsrc=" + this._data.dsrc;
        test_rdp.Get(qs);
        
        
        if(cssQuery(".contentLoader_cancelled_request").length>0) return;

        //Add Message to the output saying that the download has been canceled.
        var cancelMsg = document.createElement("span");
        cancelMsg.className="contentLoader_cancelled_request";
        cancelMsg.innerHTML = this.cancelMessage;
        //We can not append to the outputElem since it seems like this message is added before the last chunk that was added.
        try{
            this.outputElem.parentNode.appendChild(cancelMsg);
        }
        catch(e){
            try{ 
                this.outputElem.appendChild(cancelMsg);
            }
            catch(e){}
        }
                
    },
    
    cleanUp: function( isCancelled) { 
        
        //Clean Up Props/Objs
        this._data = { "curl": null, "dsrc": null, "oid": null, "pid": 0 };
        this._statusStr = "";
        this._dataLoadedLength = 0;
        this._renderQueue = [];
        this._isRunning = false;
        this._isCompleted = false;
        this._hasInitRun = false;
        this._isCanceled = isCancelled?true:false;
        this._retryCount = 0;  
        
        if(!this._isCanceled){
            for(var x in this.listenerEventsNames){        
                this._notifier.oQuee[ this.listenerEventsNames[x] ] = {};
                delete this._notifier.oQuee[ this.listenerEventsNames[x] ];
            }
        }
        
    },


    //PRIVATE METHODS

    _fetchChunk : function() { 

        var ref = this;

        //Called when we do not get a 200 status
        var failLoad = function(obj) {
            ref._endError(obj);
        };

        //Called when we get a 200 status
        var passLoad = function(obj) {
            ref._loadChunk(obj);
        };

        //Set up the Ajax Call
        var test_rdp = new RemoteDataProvider(this.sUrl);
        test_rdp.onSuccess = passLoad;
        test_rdp.onError = failLoad;
        test_rdp.Get(this._getParams());        

    },

    //This could be done differently to optimize for speed
    _getParams : function() { 

        //build up the querystring with the values from the object
        var qs = [];
        for (var prop in this._data) {
            if (this._data[prop] !== null) {
                qs.push(prop + "=" + this._data[prop]);
            }
        }
        return "?" + qs.join("&");

    },

    _loadChunk: function(xhrObj) { 

        if(this._isCanceled) return;
    
        //Grab the text from the server
        var htmlChunk = xhrObj.responseText;
        
        var previousPid = parseInt(this._data.pid, 10) || 0;

        //Grab info from the xhr http headers       
        var contentLen = xhrObj.getResponseHeader("content-length");        
        this._data.dsrc = xhrObj.getResponseHeader("dsrc") || null;
        this._data.oid = xhrObj.getResponseHeader("oid") || null;
        this._data.pid = xhrObj.getResponseHeader("pid") || 0;
        this._statusStr = xhrObj.getResponseHeader("status-str") || "N/A";

        //Content Length is not be sent down, this is a temp fix!
        if(!contentLen){
            contentLen = htmlChunk.length;
        } 
                
        //Make sure we have content to add to the page
        if (contentLen > 0 && (this._data.pid == previousPid + 1 || this._data.pid === "0") && this._statusStr.match(/^send page #\d+$/i) ){

            //Reset retry count
            this._retryCount = 0;

            //Start process fetch the next chunk
            this._fetchNext();

            //Update total length 
            this._dataLoadedLength += parseInt(contentLen,10);

            //Append to render queue
            this._renderQueue.push(htmlChunk);

            //call functionality to dump html code onto page
            this._outputChunk();

        }
        else if (contentLen == 0 && this._data.pid == 0 && this._statusStr.match(/^send page #\d+$/i) ){
            this._endProcess();
        }
        else if(this._data.pid == previousPid && this._retryCount <= this.retryMaximumCount && this._statusStr.match(/^page #\d+ not ready$/i) ){            
            this._retryCount++;        
            var ref = this;
            window.setTimeout(function(){if(ref._isRunning)ref._fetchChunk();},this.retryPauseTime);
        }
        else if( this._retryCount > this.retryMaximumCount && this._statusStr.match(/^page #\d+ not ready$/i) ){
            this._endError(xhrObj);        
        }
        else {
            this._endError(xhrObj);
        }


    },

    _fetchNext: function() { 

        if(this._isCanceled) return;
    
        var ref = this;

        function wait(){            
            ref._fetchChunk();
        }

        //If the pid is not zero than we may have more left on the server to fetch
        //The server resets pid to zero when done. [wish it was -1!]
        if (this._data.pid !== "0" && this._isRunning) {
            var waitTime = (this._data.pid === "1")?this.pageOneDelay:this.pageNormalDelay;
            window.setTimeout(wait,waitTime);
        }
        else if(this._data.pid === "0"){
            this._endProcess();
        }
    },

    _outputChunk: function() { 

        //If we are paused, than do not render!
        if (!this._isRunning && this._renderQueue.length === 0) {
            return;
        }

        //Grab next chunk to render
        var htmlChunk = this._renderQueue.pop();

        //Set the innerHTML with the new code
        var div = document.createElement(this.outerElemType);
        //div.innerHTML = "<" + this.innerElemType + ">" + htmlChunk + "</" + this.innerElemType + ">";
        
        /*START OF FIX FOR ILLEGAL MARKUP*/
        var tagBeg = "";
        var tagEnd = "";
        
        if(htmlChunk.indexOf("<pre") !== -1 && htmlChunk.indexOf("</pre") === -1){
            tagEnd ="</pre>";
        }
        else if(htmlChunk.indexOf("<pre") === -1 && htmlChunk.indexOf("</pre") !== -1){
            tagBeg ="<pre>";
        }
        else if(htmlChunk.indexOf("<pre") === -1 && htmlChunk.indexOf("</pre") === -1){
            tagBeg = "<pre>";
            tagEnd = "</pre>";
        }
        else if(htmlChunk.indexOf("<div") !== -1 && htmlChunk.indexOf("</div") === -1){
            tagEnd ="</div>";
        }
        else{
          //tags exist
        }
        div.innerHTML = tagBeg + htmlChunk + tagEnd;
        /*END OF FIX FOR ILLEGAL MARKUP*/
        
        this.outputElem.appendChild(div);

        var progressData = {
            "dataLength": this._dataLoadedLength/1048576
        };
		
		this._notifyStat( div );
        
        //Send out Notification with new content length numbers
        this._notifier.Notify(null, this.broadcastEventNames.UPDATE, progressData);

    },

    _finishQueueRendering: function() { 
        //Loop through the remaining things to render
        //This might be better as a timeout, but this should not be long unless person pauses 1000 times.
        while (this._renderQueue.length > 0 && this._isRunning) {
            this._outputChunk();
        }
    },

    _endProcess: function() { 
    
        //Process anything that might be remaining in the Queues
        this._finishQueueRendering();

        //Notify DONE with content length number
        //Send out Notification with new content length numbers
        this._notifier.Notify(null, this.broadcastEventNames.FINISHED, {
            "length": this._dataLoadedLength/1048576
        });

        this._isRunning = false;
        this._isCompleted = true;

        //Clean Up Props/Objs
        var ref = this;
        setTimeout(function(){ref.cleanUp();},1000);
        
        //Let sg scan the page for new links that were added!
        if(typeof ncbi !== "undefined" && typeof ncbi.sg  !== "undefined" && typeof ncbi.sg.scanLinks !== "undefined" ){
            ncbi.sg.scanLinks();
        }
    },

    _endError: function(xhrObj) { 
            
        //Notify ERROR
        this._notifier.Notify(null, this.broadcastEventNames.ERROR, {
            "message" : "Error loading document. Reload page to try again.", 
            "btnText" : "Reload",           
            "xhrObj" : xhrObj
        });

        //Clean Up Server and clean up the Props/Objs
        this.cancelFetch();

    },
    
    _registerNotifierListeners : function(){ 
        
        var ref = this;
        var eNames = this.listenerEventsNames;
        
        this._notifier.setListener(null, eNames.START, function(){ ref.resumeFetch(); } );
        this._notifier.setListener(null, eNames.STOP, function(){ ref.pauseFetch(); } );
        this._notifier.setListener(null, eNames.CANCEL, function(){ ref.cancelFetch(); } );
        
    },
	
	_notifyStat : function( div ){

		//Make sure sg is on page
		if(typeof ncbi !== "undefined" && ncbi.sg && ncbi.sg.scanLinks){
	
			//Find all of the links and buttons in the div
			var links = div.getElementsByTagName("a");
            var btns = div.getElementsByTagName("button");
            if (typeof jQuery !== "undefined") {
                var btns2 = jQuery("input[type=button], input[type=submit], input[type=reset]").get();
            } else {
                var fInputs = div.getElementsByTagName("input");
                btns2 = [];
                var i = fInputs.length - 1;
                while (i >= 0) {
                    var inp = fInputs[i];
                    var typ = inp.type;
                    if (typ === "button" || typ === "submit" || typ === "reset") {
                        btns2.push(inp);
                    }
                    i--;
                }
            }

			//convert nodeList to array
			try{
				//IE8- do not support this, throws an error so we have to catch it				
				var arLinks = Array.prototype.slice.call(links);
				var arBtns = Array.prototype.slice.call(btns);
				var arInputs = Array.prototype.slice.call(btns2);

				//join the list together
				var joinedElems = arLinks.concat(arBtns).concat(arInputs);
			}
			catch( ex ){
				//For IE8-, loop through and build the array
				var joinedElems = [];
				var iCnt = links.length-1;
				while(iCnt>-1){
					joinedElems.push(links[iCnt--]);
				}
				iCnt = btns.length-1;
				while(iCnt>-1){
					joinedElems.push(btns[iCnt--]);
				}
				i = btns2.length-1;
				while(iCnt>-1){
					joinedElems.push(btns2[iCnt--]);
				}
			}
			
			//Call scan to hook up links
			ncbi.sg.scanLinks( joinedElems );
			
		}

	}

};

ContentLoader.removeCancelMessages = function(){    
    var canMess = cssQuery(".contentLoader_cancelled_request");
    while(canMess.length>0){
        var msg = canMess.pop();
        msg.parentNode.removeChild(msg);
    }
};


