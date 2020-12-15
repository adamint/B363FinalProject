jQuery(function(){
    jQuery('#rss_createfeed').bind('click',createRssFeed);
    function createRssFeed (e){
        e.preventDefault();
        var oThis = jQuery(this);
	   	var args = {
            'QueryKey': oThis.data('qk'),
            'Db': oThis.data('db'),
            'RssFeedName': jQuery('#rss_name').val(),
            'RssFeedLimit': jQuery('#rss_results').val(),
            'HID': oThis.data('hid')
        };
        Portal.$send('CreateRssFeed',args);
    }  
});

;
(function($){

    $(function() {    

        var theSearchInput = $("#term");
        var originalTerm = $.trim(theSearchInput.val());
        var theForm = jQuery("form").has(theSearchInput);
        var dbNode = theForm.find("#database");
        var currDb = dbNode.val();
        var sbConfig = {};
        try{
            sbConfig = eval("({" + theSearchInput.data("sbconfig") + "})");
        }catch(e){}
        var defaultSubmit =  sbConfig.ds == "yes";
        var searched = false;
        var dbChanged = null; //since db.change is triggered as a work around for JSL-2067 
        var searchModified = false; //this is used to allow searching when something esle changed on the page with out the term changing
    
        if(!$.ncbi)
            $.extend($,{ncbi:{}});
        if(!$.ncbi.searchbar)
            $.extend($.ncbi,{searchbar:{}});
            
        $.extend($.ncbi.searchbar,
            (function(){
                //*****************private ******************/
               function doSearchPing() {
                   try{
                    var cVals = ncbi.sg.getInstance()._cachedVals;
                    var searchDetails = {}
                    searchDetails["jsEvent"] = "search";
                    var app = cVals["ncbi_app"];
                    var db = cVals["ncbi_db"];
                    var pd = cVals["ncbi_pdid"];
                    var pc = cVals["ncbi_pcid"];
                    var sel = dbNode[0];
                    var searchDB = sel.options[sel.selectedIndex].value;
                    var searchText = theSearchInput[0].value;
                    if( app ){ searchDetails["ncbi_app"] = app.value; }
                    if( db ){ searchDetails["ncbi_db"] = db.value; }
                    if( pd ){ searchDetails["ncbi_pdid"] = pd.value; }
                    if( pc ){ searchDetails["ncbi_pcid"] = pc.value; }
                    if( searchDB ){ searchDetails["searchdb"] = searchDB;}
                    if( searchText ){ searchDetails["searchtext"] = searchText;}
                    ncbi.sg.ping( searchDetails );
                   }catch(e){
                       console.log(e);
                   }
                }
                function getSearchUrl(term){
                    var url = "";
                    if (typeof(NCBISearchBar_customSearchUrl) == "function") 
                            url = NCBISearchBar_customSearchUrl();
                    if (!url) {
                        var searchURI = dbNode.find("option:selected").data("search_uri");
                        url = searchURI ?  searchURI.replace('$',term) : 
                             "/" + dbNode.val() + "/" + ( term !="" ? "?term=" + term : "");
                        }
                    return url;
                }
            
                return {
                    //*****************exposed attributes and functions ******************/
                    'theSearchInput':theSearchInput,
                    'theForm':theForm,
                    'dbNode':dbNode,
                    'searched':searched,
                    'setSearchModified':function() { searchModified = true; },
                    'setSearchUnmodified':function() { searchModified = false; },
                    'searchModified':function(){return searchModified;},
                    'doSearch':function(e){
                           e.stopPropagation();
                           e.preventDefault();
                           //checking for the searched flag is necessary because the autocompelete control fires on enter key, the form submit also fires on enter key
                           if(searched == false){
                               searched = true;
                               theForm.find('input[type="hidden"][name^="p$"]').attr('disabled', 'disabled');
                               //$("input[name]").not(jQuery(".search_form *")).attr('disabled', 'disabled');
                               if (defaultSubmit)
                                   $.ncbi.searchbar.doSearchPing();
                               else {
                                   var term = $.trim(theSearchInput.val());
                                   if (dbChanged || searchModified || term !== originalTerm){
                                       $.ncbi.searchbar.doSearchPing();
                                       var searchUrl = $.ncbi.searchbar.getSearchUrl(encodeURIComponent(term).replace(/%20/g,'+'));
                                       var doPost = (term.length  > 2000) ? true : false; 
                                       if (doPost){
                                           if (e.data.usepjs){
                                               Portal.$send('PostFrom',{"theForm":theForm,"term":term,"targetUrl":searchUrl.replace(/\?.*/,'')});
                                           }
                                           else{
                                               theForm.attr('action',searchUrl.replace(/\?.*/,''));
                                               theForm.attr('method','post');
                                           }
                                       }
                                       else {
                                           window.location = searchUrl;
                                       }
                                   }
                                   else{ //if (term !== originalTerm){
                                       searched = false;
                                   }
                               }
                           }
                    },
                    'onDbChange':function(e){
                         if (dbChanged === null)
                             dbChanged = false;
                         else
                             dbChanged = true;
                         var optionSel = $(e.target).find("option:selected");
                         var dict = optionSel.data("ac_dict");
                         if (dict){
                             //theSearchInput.ncbiautocomplete("option","isEnabled",true).ncbiautocomplete("option","dictionary",dict);
                             theSearchInput.ncbiautocomplete().ncbiautocomplete({
                                    isEnabled: true,
                                    dictionary: dict
                                });
                             theSearchInput.attr("title","Search " + optionSel.text() + ". Use up and down arrows to choose an item from the autocomplete.");
                         }
                         else{
                           theSearchInput.ncbiautocomplete().ncbiautocomplete("turnOff",true);
                           theSearchInput.attr("title", "Search " + optionSel.text());
                         }
                         if (defaultSubmit)
                            theForm.attr('action','/' + dbNode.val() + '/');  
                    },
                    'doSearchPing':function(){
                        doSearchPing();
                    },
                    'getSearchUrl':function(term){
                        return getSearchUrl(term);
                    }
                    
                };//end of return 
             })() //end of the self executing anon
        );//end of $.extend($.ncbi.searchbar
    
         function initSearchBar(usepjs){
            //enable the controls for the back button
            theForm.find('input[type="hidden"][name^="p$"]').removeAttr('disabled');
             if (usepjs)
                 portalSearchBar();
         }
         
        
    
        function portalSearchBar(){
            
            Portal.Portlet.NcbiSearchBar = Portal.Portlet.extend ({
                init:function(path,name,notifier){
                    this.base (path, name, notifier);
                },
                send:{
                    "Cmd":null,
                    "Term":null
                },
                "listen":{
                    "PostFrom":function(sMessage,oData,sSrc){
                        this.postForm(oData.theForm,oData.term,oData.targetUrl);
                    }
                },
                "postForm":function(theForm,term,targetUrl){
                       //console.log('targetUrl = ' + targetUrl);
                       theForm.attr('action',targetUrl);
                       theForm.attr('method','post');
                       this.send.Cmd({
                            'cmd' : 'Go'
                        });
                           this.send.Term({
                            'term' : term
                        });
                        Portal.requestSubmit();
                },
                'getPortletPath':function(){
                    return this.realpath + '.Entrez_SearchBar';
                }
            });
    
        }//portalSearchBar
        


         //portal javascript is required to make a POST when the rest of the app uses portal forms 
         var usepjs = sbConfig.pjs == "yes"; 
         //console.log('sbConfig',sbConfig);
         initSearchBar(usepjs);
         
         dbNode.on("change",$.ncbi.searchbar.onDbChange);
        
        theForm.on("submit",{'usepjs':usepjs},$.ncbi.searchbar.doSearch);
        theSearchInput.on("ncbiautocompleteenter ncbiautocompleteoptionclick", function(){theForm.submit();});
        //a work around for JSL-2067
        dbNode.trigger("change");
        //iOS 8.02 changed behavior on autofocus, should probably check other mobile devices too
        if (sbConfig.afs == "yes" && !/(iPad|iPhone|iPod)/g.test(navigator.userAgent) ){ 
            window.setTimeout(function(){
                try{
                	var x = window.scrollX, y = window.scrollY; // EZ-8676
                	
                    var size= originalTerm.length;
                    if (size == 0 || /\s$/.test(originalTerm))
                        theSearchInput.focus()[0].setSelectionRange(size, size);
                    else
                        theSearchInput.focus().val(originalTerm + " ")[0].setSelectionRange(size+1, size+1);
                        
                    window.scrollTo(x, y);
                }
                catch(e){} //setSelectionRange not defined in IE8
            },1);
        }
        
        //set the query changed flag true after a few seconds, still prevents scripted clicking or stuck enter key
        window.setTimeout(function(){$.ncbi.searchbar.setSearchModified();},2000);
         
     });//End of DOM Ready

})(jQuery);

/*
a call back for the 'Turn off' link at the bottom of the auto complete list
*/
function NcbiSearchBarAutoComplCtrl(){
    jQuery("#term").ncbiautocomplete("turnOff",true);
    if (typeof(NcbiSearchBarSaveAutoCompState) == 'function')
        NcbiSearchBarSaveAutoCompState();
 }

 



;
jQuery(function () {
    Portal.Portlet.Entrez_SearchBar = Portal.Portlet.NcbiSearchBar.extend ({
        init:function(path,name,notifier){
            this.base (path, name, notifier);
            var oThis = this;
            jQuery("#database").on("change", function(){
                oThis.send.DbChanged({'db' : this.value});
            });
        },
        send:{
            "Cmd":null,
            "Term":null,
            "DbChanged":null
        },
        'listen':{
            "PostFrom":function(sMessage,oData,sSrc){
        	    this.postForm(oData.theForm,oData.term,oData.targetUrl);
        	    },
            "ChangeAutoCompleteState": function(sMessage, oData, sSrc) {
        	    this.ChangeAutoCompleteState(sMessage, oData, sSrc);
                },
            'CreateRssFeed':function(sMessage,oData,sSrc){
                this.createRssFeed(sMessage,oData,sSrc);
            },
            'AppendTerm': function(sMessage, oData, sSrc) {
    		    this.ProcessAppendTerm(sMessage, oData, sSrc);
    		},
    		// to allow any other portlet to clear term if needed  
    		'ClearSearchBarTerm': function(sMessage, oData, sSrc) {
    			jQuery("#term").val("");
    		},
    		// request current search bar term to be broadcast  
    		'SendSearchBarTerm': function(sMessage, oData, sSrc) {
    			this.send.Term({'term' : jQuery("#term").val()});
    		}
        },
        'createRssFeed':function(sMessage,oData,sSrc){
            
            var site = document.forms[0]['p$st'].value;
    	   	var portletPath = this.getPortletPath();
    	   	
            try{
                var resp = xmlHttpCall(site, portletPath, 'CreateRssFeed', oData, receiveRss, {}, this);
            }
            catch (err){
                alert ('Could not create RSS feed.');
            }
            function receiveRss(responseObject, userArgs) {
        	    try{
            	    //Handle timeouts 
            	    if(responseObject.status == 408){
            	        //display an error indicating a server timeout
            	        alert('RSS feed creation timed out.');
            	    }
            	    
            	    // deserialize the string with the JSON object 
            	    var response = '(' + responseObject.responseText + ')'; 
            	    var JSONobject = eval(response);
            	    // display link to feed
            	    jQuery('#rss_menu').html(JSONobject.Output,true);
            	    //jQuery('#rss_dropdown a.jig-ncbipopper').trigger('click');
            	    jQuery('#rss_dropdown a.jig-ncbipopper').ncbipopper('open');
            	    //document.getElementById('rss_menu').innerHTML = JSONobject.Output;
                }
                catch(e){
                    alert('RSS unavailable.');
                }
            }
                
        },
        'getPortletPath':function(){
            return this.realpath + '.Entrez_SearchBar';
        },
        "ChangeAutoCompleteState": function(sMessage, oData, sSrc){
            var site = document.forms[0]['p$st'].value;
            var resp = xmlHttpCall(site, this.getPortletPath(), "ChangeAutoCompleteState", {"ShowAutoComplete": 'false'}, function(){}, {}, this);
        },
        "ProcessAppendTerm" : function(sMessage, oData, sSrc){
            var theInput = jQuery("#term");
    	    var newTerm = theInput.val();
    	    if (newTerm != '' && oData.op != ''){
    	        newTerm = '(' + newTerm + ') ' + oData.op + ' ';
    	    }
    	    newTerm += oData.term;
    	    theInput.val(newTerm); 
    	    
    	    theInput.focus();
    	}
    }); //end of Portlet.extend
}); //end of jQuery ready

function NcbiSearchBarSaveAutoCompState(){
    Portal.$send('ChangeAutoCompleteState');
}


;
Portal.Portlet.Entrez_Facets = Portal.Portlet.extend ({
  
	init: function (path, name, notifier) 
	{ 
		this.base (path, name, notifier);
		var jFacetObj = jQuery(".facet_cont");
		if (jFacetObj[0]){
    		jFacetObj.find('.facet a').live('click',{'thisObj':this},this.filterClicked);
    		jFacetObj.find('.facet_more_apply').live('click',{'thisObj':this},this.facetMoreApplyClicked);
    		jFacetObj.find('.facet_tools a.jig-ncbipopper').bind('ncbipopperopen',{'thisObj':this},this.onMoreFilterGroups);
    		jFacetObj.find('#filter_groups_apply').bind('click',{'thisObj':this},this.filterGroupsApplyClicked);
    		jFacetObj.find('.btn_date_apply').live('click',{'thisObj':this},this.dateRangeApplyClicked);
    		jFacetObj.find('.btn_date_clear').live('click',{'thisObj':this},this.dateRangeClearClicked);
    		jFacetObj.find('.btn_range_apply').live('click',{'thisObj':this},this.rangeApplyClicked);
    		jFacetObj.find('.btn_range_clear').live('click',{'thisObj':this},this.rangeClearClicked);
    		jFacetObj.find('#facet_fields_apply').live('click',{'thisObj':this},this.facetFieldsApplyClicked);
    		
    		jFacetObj.find('.facet .more a').live('ncbipopperopen',{'thisObj':this},this.onMoreFiltersOpen);
    		jFacetObj.find('.facets_dialog').live('keypress',{'thisObj':this},this.facetDialogKeyPress);
    		jFacetObj.find('.input_date_ym').live('blur',this.autoFillDateInputs);
    		jQuery('#reset_from_message_res').live('click',{'thisObj':this},this.resetFromMessageRes);
    		
    		this.DefaultShownFacetGroups = jFacetObj.data('default_grps').split(',');
    		
    		jFacetObj.find("input[type=checkbox]").live("change",function(e){
    		   ncbi.sg.ping( this, e, "additionalFilters", { "action" : this.checked ? "checked" : "unchecked" } );
    		});
    		
    		jFacetObj.find(".of_sel_inp").live("ncbiautocompleteoptionclick", //ncbiautocompleteenter results in multiple events
    		    {'thisObj':this},this.openFieldSelected).live("keypress",{'thisObj':this},this.openFieldKeyPress);  
    		jFacetObj.find("ul.facet li.of_sel button.of_add").live("click",{'thisObj':this},this.openFieldAddClicked);
    		jFacetObj.find(".of_sel_inp").live("keyup ncbiautocompleteoptionclick input",{'thisObj':this},this.openFieldChanged);
    		
    		this.jFacetObj = jFacetObj;
    	}
		
		jQuery('#reset_from_message').on('click',{'thisObj':this},this.resetFromMessage);
		
	},
	'send':{
	    'Cmd':null,
	    'SendSearchBarTerm': null,
	    'SetTimelineFilter':null,
	    'QueryKey':null,
	    'LinkName':null,
	    'IdsFromResult':null
	},
	'listen':{
	    'FacetFilterSet':function(sMessage,oData,sSrc){
		    this.handleFacetFilterSet(oData.FacetsUrlFrag,oData.BMFacets);
		},
		'FacetFiltersCleared':function(sMessage,oData,sSrc){
		    this.handleFacetFiltersCleared();
		}
	},
	'DefaultShownFacetGroups':[],
	'jFacetObj':null,
	'filterClicked':function(e){
	    e.preventDefault();
	    var oThis = jQuery(this);
	    var facetUl = oThis.closest("ul.facet");
	    var filter_id = facetUl.data('filter_id'),value_id = oThis.data('value_id');
	    var check_on = ! oThis.parent().hasClass("selected");
	    if (value_id == 'reset'  )
	        Portal.$send('FacetFilterSet',{'FacetsUrlFrag': 'fcl=all'});
	    else if (value_id == 'fetch_more'  ){
	        if (!oThis.hasClass("jig-ncbipopper"))
	            e.data.thisObj.FetchMoreOptions(filter_id,oThis);
	    }
	    else if (value_id == 'fetch_more_exp')
	        e.data.thisObj.ShowAllFacetsToggle(e);
	    else if (filter_id == 'field_search' ){
	        if (!oThis.hasClass("jig-ncbipopper"))
	            e.data.thisObj.removeFieldSelection();
	    }
	    else if (oThis.parent().hasClass('of_sel'))
	        return;
	    else if (facetUl.data('of')=='yes' && oThis.parent().hasClass('of_fil_val')){
	        if (check_on)
	            e.data.thisObj.applyOpenField(oThis,filter_id);
	        else
	            e.data.thisObj.removeOpenField(oThis,filter_id);
	    }
	    else if (facetUl.data('of')=='yes' && !oThis.parent().hasClass('fil_val'))
	        e.data.thisObj.removeOpenField(oThis,filter_id);
	        
	    else if (facetUl.data('ss')=='yes')
	        e.data.thisObj.handleFilterSelection({'filterId':filter_id.toString(),'valueId':value_id.toString(),'checkOn':check_on,'replaceAll':true});
	    else if ((filter_id || value_id) && !oThis.hasClass("jig-ncbipopper") && !oThis.hasClass("facet_more_cancel") )
    	    e.data.thisObj.handleFilterSelection({'filterId':filter_id.toString(),'valueId':value_id.toString(),'checkOn':check_on,
    	        'dateSearch':facetUl.data('ds')=='yes','rangeSearch':facetUl.data('rs')=='yes'});
    	
        
	},
    'handleFilterSelection':function(opts){
	    var defOpts = {'filterId':undefined,'valueId':undefined,'checkOn':undefined,'replaceAll':undefined,'dateSearch':undefined,'rangeSearch':undefined};
	    opts = jQuery.extend(defOpts,opts);
	    
	    //when replaceAll is true, all values in that filter group are replaced, used for single select groups
	    //valueId == ''  means clear that group 
	    //var currFilterString = window.location.search.match(/filters=([^&]*)/);
	    var currFilterString = this.getValue('FacetsUrlFrag').match(/filters=([^&]*)/);
	    //var currFilterVals = currFilterString && currFilterString[1] ? currFilterString[1].split(';') : [];
	    var currFilterVals = currFilterString ? currFilterString[1].split(';') : [];
	    var possibleVals = [];
	    var facetGrpUl = this.jFacetObj.find('ul[data-filter_id = "' + opts.filterId + '"]');
	    facetGrpUl.find('li.fil_val a').each(function(){
	        var possIdVal = jQuery(this).data('value_id');
	        if (possIdVal)
	            possibleVals.push(possIdVal.toString());
	        });
	    currFilterVals = this.customFilterRead(currFilterVals,possibleVals,opts.filterId,opts.dateSearch,opts.rangeSearch);
	    
	    function removeValues(valuesArr) {
	        jQuery(valuesArr).each(function(ind,val){
	            var indexInCurr = jQuery.inArray(val,currFilterVals);
	            if (indexInCurr != -1)
	                 currFilterVals.splice(indexInCurr,1);
	        });
	    }
	    function addValues(valuesArr) {
	        jQuery(valuesArr).each(function(ind,val){
	             var indexInCurr = jQuery.inArray(val,currFilterVals);
	             if (indexInCurr == -1)
	                 currFilterVals.push(val);
	        });
	    }
	    
	    if (opts.replaceAll == true && opts.checkOn){ //single select
	        removeValues(possibleVals);
	        addValues(opts.valueId.split(';'));
	    }
	    else if (opts.valueId == ''){
	        removeValues(possibleVals);
	    }
	    else if (opts.checkOn){
	        addValues(opts.valueId.split(';'));
	    }
	    else if (!opts.checkOn){
	        removeValues(opts.valueId.split(';'));
	    }
	    var bmFacets = '';
	    if (facetGrpUl.data('bm') == 'yes' && !(opts.checkOn != true && facetGrpUl.find('li.selected').size() == 1) ){
	        bmFacets = 'bmf=' + facetGrpUl.data('filter_id') + ':' +
	            jQuery.makeArray(facetGrpUl.find('li.fil_val a').map(function(){return (jQuery(this).data('value_id'))})).join(';');
	    }
	    
	    Portal.$send('FacetFilterSet',{'FacetsUrlFrag':this.getNewUrlFrag(currFilterVals.join(';')),'BMFacets':bmFacets});
        
	},	
	'customFilterRead':function(currFilterVals,possibleVals,filterId,datesearch,rangesearch){
	    //if there is db specific filter reading override this
	    if(datesearch == true){ 
	        var rg = new RegExp(filterId + '_' + '\\d{4}\/\\d{2}\/\\d{2}_\\d{4}\/\\d{2}\/\\d{2}');
	        //for (var ind in currFilterVals){
	        for(var ind=0; ind<currFilterVals.length; ind++){
	            if (rg.exec(currFilterVals[ind]) ||
	                jQuery.inArray(currFilterVals[ind],possibleVals) != -1 ){
	                currFilterVals.splice(ind,1);
	            }
	        }
	    }
	    else if (rangesearch == true){
	        var rg = new RegExp(filterId + '_[^_]+_[^_]+');
	        for(var ind=0; ind<currFilterVals.length; ind++){
	            if (rg.exec(currFilterVals[ind]) ||
	                jQuery.inArray(currFilterVals[ind],possibleVals) != -1 ){
	                currFilterVals.splice(ind,1);
	            }
	        }
	    }
	    return currFilterVals;
	},
	'getNewUrl':function(filters,fcl,allowEmptyTerm){
	    var currUrl = window.location.pathname + window.location.search ;
        currUrl = this.replaceUrlParam(currUrl, 'filters', filters);  
        currUrl = this.replaceUrlParam(currUrl,'fcl', fcl); 
        currUrl = this.replaceUrlParam(currUrl,'querykey','');
        currUrl = this.replaceUrlParam(currUrl,'cmd','');
        currUrl = this.addTermToUrl(currUrl,allowEmptyTerm);
        //currUrl = this.appendUrlHash(currUrl);
        return currUrl;
	},
	'addTermToUrl':function(currUrl,allowEmptyTerm){
/*	    if (!currUrl.match(/term=*\/)){
	        //currUrl = this.replaceUrlParam(currUrl,'term',this.jFacetObj.data('term'));
	    } */
	    var term = jQuery.trim(jQuery("#search_term").val());
	    if (allowEmptyTerm != true)
	        term = term == '' ? 'all[sb]' : term;
	    currUrl = this.replaceUrlParam(currUrl,'term',term);
	    return currUrl;
	},
	'replaceUrlParam':function(currUrl,paramName,paramVal,allowEmpty){
	    paramVal = paramVal ? paramVal : '';
        if (paramVal != '' || allowEmpty)
            if (currUrl.indexOf(paramName + '=') == -1)
                currUrl = currUrl + (currUrl.indexOf('?') != -1 ? '&' : '?') + paramName + '=' + paramVal;
            else
                currUrl = currUrl.replace(new RegExp(paramName + '=[^&]*'), paramName + '=' + paramVal);
         else
             if (currUrl.match(new RegExp('&' + paramName + '=[^&]*')))
                 currUrl = currUrl.replace(new RegExp('&' + paramName + '=[^&]*'),'');
             else if (currUrl.match(new RegExp(paramName + '=[^&]*&')))
                 currUrl = currUrl.replace(new RegExp(paramName + '=[^&]*&'),'');
             else
                 currUrl = currUrl.replace(new RegExp(paramName + '=[^&]*'),'');
         return currUrl;
	},
	'getNewUrlFrag':function(filters,fcl){
	    var currUrl = this.getValue('FacetsUrlFrag');
        currUrl = this.replaceParamFrag(currUrl, 'filters', filters);
        currUrl = this.replaceUrlParam(currUrl,'fcl', fcl); 
        return currUrl;
	},
	'replaceParamFrag':function(currUrl,paramName,paramVal){//TO-DO ... poorly named, refactor
          //currUrl = currUrl.replace(new RegExp(paramName + '=[^;]*'), paramName + '=' + paramVal);
          currUrl = 'filters=' + paramVal;
          return currUrl;
	},
	'replaceUrlParamFrag':function(origFrag,paramName,paramVal,delim){ 
	    delim = delim || ';';
	    if (paramVal != '')
            if (origFrag.indexOf(paramName + '=') == -1)
                return  origFrag == '' ? paramName + '=' + paramVal : origFrag + delim + paramName + '=' + paramVal ;
            else
                return origFrag.replace(new RegExp(paramName + '=.[^' + delim + ']*'), paramName + '=' + paramVal);
         else
             if (origFrag.match(new RegExp(delim + paramName + '=.[^' + delim + ']*')))
                 return origFrag.replace(new RegExp(delim + paramName + '=.[^' + delim + ']*'),'');
             else if (origFrag.match(new RegExp(paramName + '=.[^' + delim + ']*' + delim)))
                 return origFrag.replace(new RegExp(paramName + '=.[^' + delim + ']*' + delim),'');
             else 
                 return origFrag.replace(new RegExp(paramName + '=.[^' + delim + ']*'),'');
        
	},
	'appendUrlHash':function(urlStr){
	    var hash = window.location.hash;
        if (hash != '')
            urlStr = urlStr + "#" + hash;
        return urlStr;
	},
	'FetchMoreOptions':function(filter_id,moreNode){
	    //if the moreNode param is not null, coming from a 'more' under a category, otherwise it is adding a whole group from 'choose filters'
	    var args = {"MoreFacetsGroupId":filter_id,"MoreFacetsNewGroup":(moreNode?"":"true"),"Db":this.jFacetObj.data('db'),"Term":jQuery("#term").val()};
        var site = document.forms[0]['p$st'].value;
        // ajax call
        xmlHttpCall(site, this.getPortletPath(), "GetMoreFilters", args, this.receiveMoreFilters, {"moreNode":moreNode}, this);
	},
	'receiveMoreFilters':function(responseObject, userArgs){
        try {
            // Handle timeouts
            if (responseObject.status == 408) {
                //this.showMessage("Server currently unavailable. Please check connection and try again.","error");
                 console.warn("Server currently unavailable. Please check connection and try again.");
                return;
            }
            var resp = '(' + responseObject.responseText + ')';
            var JSONobj = eval(resp);
            var allFilters = JSONobj.all_filters;
            if (userArgs.moreNode)
                this.addMoreFiltersDialog(allFilters,userArgs.moreNode);
            else
                this.addMoreFilterGroup(allFilters);
            //TO-DO: be more specific about this scan
            jQuery.ui.jig.scan();
            
        } catch (e) {
            //this.showMessage("Server error: " + e, "error");
            console.warn("Server error: " + e);
        }
	},
	'addMoreFiltersDialog':function(allFilters,targetNode){
	    targetNode.addClass("jig-ncbipopper");
	    var popper = jQuery(targetNode.attr('href'));
	    var filterId = targetNode.closest("ul.facet").data('filter_id');
	    var selFilters = this.jFacetObj.find('ul[data-filter_id = "' + filterId + '"] li a');
	    allFilters = jQuery(allFilters);
	    selFilters.each(function(){
	        allFilters.find('li input[id = "' + jQuery(this).data('value_id') + '"]').attr('checked','checked');
	        });   
	    popper.append(allFilters);
	    jQuery.ui.jig.scan(targetNode,['ncbipopper']);
	    targetNode.ncbipopper('open');
	},
	'getPortletPath': function(){
        return this.realname;
    },
    'facetMoreApplyClicked':function(e){
        e.preventDefault();
        var self = jQuery(e.target);
        if (self.find('span').text() == 'Add'){
            e.data.thisObj.addOpenFieldValue(self.closest('ul.facet'));
            return;            
        }
        var facetGroup = self.closest('ul.facet');
        var groupId = facetGroup.data('filter_id');
        var selFilters = jQuery('#' + groupId + '_more').find('li input').filter('input:checked');
        var filtersInFacet = facetGroup.find('li.fil_val a');
        var ofFiltersInFacet = facetGroup.find('li.of_fil_val a');
        var addedFacets = [], removedFacets = [], newFacets = [];
        var isOpenField = facetGroup.find('.filter_grp').is('.of_grp');
        //alert(isOpenField);
        selFilters.each(function () {
            var oThis = jQuery(this);
            var filterId = oThis.data('value_id');
            var filterName = oThis.next().text();
            addedFacets.push(filterId);
            var parentValueId = oThis.parent().data('value_id');
            if( oThis.parent().data('value_id') == "of_val" && ofFiltersInFacet.filter(function(ind,el){return el.text == filterName;} ).size() == 0){
                jQuery('<li class="of_fil_val"><a data-qval="' + filterName + '" data-value_id="' + filterName + '" href="#">' + filterName + '</a></li>').insertBefore(facetGroup.find("li.more"));
            }
            else if (oThis.parent().data('value_id') != "of_val" && filtersInFacet.filter('a[data-value_id = "' + filterId + '"]').size() === 0){
                newFacets.push(filterId);
                //find the place to insert
                var insertBeforeNode;
                facetGroup.find('li.fil_val').each(function(){
                    if (jQuery(this).find('a').text() > filterName){
                        insertBeforeNode = jQuery(this);
                        return false;
                    }
                });
                if (!insertBeforeNode)
                    insertBeforeNode = facetGroup.find("li.more")
                    
                jQuery('<li class="fil_val"><a data-value_id="' + filterId + '" href="#">' + filterName + '</a></li>').insertBefore(insertBeforeNode);
            }
        });
        filtersInFacet.add(ofFiltersInFacet).each(function(){
            var oThis = jQuery(this);
            var filterId = oThis.data('value_id');
            if (selFilters.filter('input[data-value_id="' + filterId + '"]').size() === 0){
                removedFacets.push(filterId);
                facetGroup.find('li.fil_val').add(facetGroup.find('li.of_fil_val')).has('a[data-value_id="' + filterId + '"]').remove();
            }
        });
        
        ncbi.sg.ping( e.target, e, "additionalFiltersApply", {"allChecked" : addedFacets, "newChecked" : newFacets , "newUnchecked": removedFacets} );
        
        facetGroup.find('li a[data-value_id="fetch_more"]').ncbipopper('close');
        
        function arrayToXml(arr){
            var xmlStr = '<Facets><FacetGroup '  + ' id = "' + groupId + '" >';
            for(var ind=arr.length -1; ind >=0 ; ind--)
                xmlStr = xmlStr + '<Facet>' + arr[ind] + '</Facet>';
            xmlStr = xmlStr + '</FacetGroup></Facets>';
            return xmlStr;
        }
        var args = {"UserSelectedFacetsNew":arrayToXml(addedFacets),"UserDeSelectedFacetsNew":arrayToXml(removedFacets)};
        
        
        var site = document.forms[0]['p$st'].value;
        // ajax call
        xmlHttpCall(site, e.data.thisObj.getPortletPath(), "UpdateUserAddedFacets", args, function(){}, null, this);       
    },
    'onMoreFilterGroups':function(e){
        jQuery('#filter_groups_apply').data('attachedTo',e.target.id);
        
        var loadedFgIds = [],activeFgIds = [];
        e.data.thisObj.jFacetObj.find('.facet .filter_grp a.clear').each(function(){
            var filterGrp = jQuery(this).closest('ul.facet');
            var filterId = 'fg_' + filterGrp.data('filter_id');
            loadedFgIds.push(filterId);
            if (filterGrp.find('li.selected')[0])
                activeFgIds.push(filterId);
        });
        var fgChecks = jQuery('#more_filter_groups input');
        fgChecks.each(function(){
            var oThis = jQuery(this);
            var currId = oThis.attr('id');
            oThis.attr('checked',jQuery.inArray(currId,loadedFgIds) != -1);
            oThis.attr('disabled',oThis.data('always_show') == 'yes' || jQuery.inArray(currId,activeFgIds) != -1)
        });
    },
    'filterGroupsApplyClicked':function(e){
        e.preventDefault();
        var loadedFgIds = [], fgIdsAdd = [],fgIdsRemove = [],selFgIds = [],fgUserSelIds=[];
        var defaultShownFacetGroups = e.data.thisObj.DefaultShownFacetGroups;
        e.data.thisObj.jFacetObj.find('.facet .filter_grp a.clear').each(function(){
            loadedFgIds.push('fg_' + jQuery(this).closest('ul.facet').data('filter_id'));
        });
        e.data.thisObj.jFacetObj.find('#more_filter_groups input').filter('input:checked').each(function(){
            selFgIds.push(jQuery(this).attr('id'));
        });
        var last = selFgIds.length;
        for (var ind =0; ind <last; ind++  ){
            if(jQuery.inArray(selFgIds[ind],loadedFgIds) == -1)
                fgIdsAdd.push(selFgIds[ind].substring(3));
            if(jQuery.inArray(selFgIds[ind],defaultShownFacetGroups) == -1)
                fgUserSelIds.push(selFgIds[ind].substring(3));
        }
        last = loadedFgIds.length;
        for (var ind =0; ind <last; ind++  )
            if (jQuery.inArray(loadedFgIds[ind],selFgIds) == -1)
                fgIdsRemove.push(loadedFgIds[ind].substring(3));
        
        e.data.thisObj.updateFiltersShown(fgIdsAdd,fgIdsRemove,fgUserSelIds);
        jQuery('#' + jQuery(this).data('attachedTo')).ncbipopper('close');
    },
    'updateFiltersShown':function(fgIdsAdd,fgIdsRemove,fgUserSelIds){
        var last = fgIdsRemove.length;
        for (var ind =0; ind <last; ind++  )
            this.jFacetObj.find('ul.facet[data-filter_id = ' + fgIdsRemove[ind] + ']').remove();
        last = fgIdsAdd.length -1;
        for (var ind = last; ind >= 0; ind--  )
            this.FetchMoreOptions(fgIdsAdd[ind],null);
        //update the selection on the session variables
        this.updateUserSelectionAttrs(fgUserSelIds,fgIdsRemove);
    },
    'updateUserSelectionAttrs':function(fgUserSelIds,fgIdsRemove){
        
        function arrayToXml(arr,rootTag,tag){
            var xmlStr = '<' + rootTag + '>';
            var last = arr.length;
            for(var i=0; i<last; i++)
                xmlStr = xmlStr + '<' + tag + '>' + arr[i] + '</' + tag + '>';
            xmlStr = xmlStr + '</' + rootTag + '>';
            return xmlStr;
        }
        var rootTag = 'FacetGroups',tag='FacetGroup';
        var args = {"UserSelectedFacetGroups":arrayToXml(fgUserSelIds,rootTag,tag),"UserDeSelectedFacetGroups":arrayToXml(fgIdsRemove,rootTag,tag)};
        var site = document.forms[0]['p$st'].value;
        // ajax call
        xmlHttpCall(site, this.getPortletPath(), "UpdateUserSelectedFacetGroups", args, function(){} , {}, this);
        
    },
    'addMoreFilterGroup':function(allFilters){
	    allFilters = jQuery(allFilters);
	    
	    //console.log('addMoreFilterGroup');
	    
/*	    if(!allFilters.find("ul>li")[0]){
	        alert("That wouldn't return any results");
	        return;
	    }*/
	    
	    //find the position and insert
	    var nFilterId = allFilters.data("filter_id");
	    //console.log('curr filter id ', nFilterId);
	    var nFilerLi = jQuery('#more_filter_groups input').filter(function(i,j){return jQuery(j).attr("id") == "fg_" + nFilterId;}).parent();
	    //console.log('curr li in more dialog',nFilerLi);
	    var selFacet = nFilerLi.nextAll("li").filter(function(i,j){return jQuery(j).find("input").is(':checked')})[0];
	    //var selFacet = nFilerLi.nextAll("li").filter(function(i,j){console.log('find next sel',jQuery(j),jQuery(j).find("input").is(':checked'),jQuery(j).find("input[checked]"),jQuery(j).find("input[checked]")[0]); return jQuery(j).find("input").is(':checked')})[0];
	    //console.log('sel facet after',selFacet);
	    var facetUl;
	    if (selFacet){
	        selFacet = jQuery(selFacet);
	        var facetId = selFacet.find("input").attr("id").substring(3);
	        facetUl = jQuery("ul.facet").filter(function(i,j){return jQuery(j).data("filter_id") == facetId})
	        console.log('sel facet after ul',facetUl);
	        
	    }
	    if (facetUl && facetUl[0])
	        facetUl.before(allFilters);
	    else{
	        var resetLink = jQuery('ul.facet_reset').has('li a[data-value_id="reset"]');
	        resetLink.before(allFilters);
	    }
	    
	    var moreLink = allFilters.find("li.more");
	    if (moreLink[0]){
	        moreLink.find("a").addClass("jig-ncbipopper");
	        jQuery.ui.jig.scan(moreLink,['ncbipopper'])
	    }
	    if (allFilters.find("#facet_fileds_popup")[0])
	        jQuery.ui.jig.scan(allFilters,['ncbipopper']);
	    
	    

    },
    'rangeApplyClicked':function(e){
        e.preventDefault();
        var elem = jQuery(e.target);
        var outerDiv = elem.closest('[id^=facet_range_div]');
        var valSt = outerDiv.find('[id^=facet_range_st]').val();
        var valEnd = outerDiv.find('[id^=facet_range_end]').val();
        var filterId = outerDiv.closest('ul.facet').data('filter_id');
        
        function validate(){
            var valid = true;
            try{
                var validationRE = outerDiv.data('vre') || '[^\s]+';
                var rg = new RegExp(validationRE);
                valid = valid && Boolean(rg.exec(valSt)) && Boolean(rg.exec(valEnd));
                
                //now check for value function
                var valueFun = outerDiv.data('vf');
                if (valueFun && valid){
                    valueFunEval = eval('(' + valueFun + ')');
                    if(typeof valueFunEval == 'function')
                        valid =  valueFunEval(valEnd) > valueFunEval(valSt); 
                    else{
                        var stValue = valueFun.replace('$',valSt);
                        stValue=eval('(' + stValue + ')');
                        var endValue = valueFun.replace('$',valEnd);
                        endValue = eval('(' + endValue + ')');
                        valid = endValue >= stValue;
                    }
                }
            }
            catch(e){
                alert('Check your validation regular expressions and functions in the source xml. Your user should never see this!');
                console.error(e);
                return false;
            }
            
            return valid;
        }
        
        var tryAgain = !(e.data.thisObj.validateRange(outerDiv) && validate()); 
        if (tryAgain){
	        alert('please enter a valid range');
	        return;
	    }
	    rangeValue = filterId + '_' + valSt + '_' + valEnd;
	    e.data.thisObj.handleFilterSelection({'filterId':filterId,'valueId':rangeValue,'checkOn':true,'rangeSearch':true}); 
	    outerDiv.data('attached-to').ncbipopper('close');
    },
    //this function is a callback. If you want to have extra validation of range values - override
    'validateRange':function(outerDiv){
        return true;
    },
    'dateRangeApplyClicked':function(e){
        e.preventDefault();
        var dateRange = '',dateRangeVals = [],tryAgain = false;
        
        //if (fieldSize == 4){
        var fieldSize = 4;
        //var year1 = jQuery('#facet_date_st_year');
        var outerDiv = jQuery(e.target).closest("[id^=facet_date_range_div]");
        var year1 = outerDiv.find('[id^=facet_date_st_year]');
        //var year2 = jQuery('#facet_date_end_year');
        var year2 = outerDiv.find('[id^=facet_date_end_year]');
        var year1Val = year1.ncbiplaceholder().ncbiplaceholder('value');
        var year2Val = year2.ncbiplaceholder().ncbiplaceholder('value');
        var year1Okay = year1Val.match(new RegExp('^\\d{' + fieldSize + '}$'));
        var year2Okay = year2Val.match(new RegExp('^\\d{' + fieldSize + '}$'));
        var oneYearThere = false;
        if (year1Val == '' && year2Okay){
            year1.val('0001');
            oneYearThere = true;
        }
        else if (year2Val == '' && year1Okay){
            year2.val('3000');
            oneYearThere = true;
        }
        if ( !oneYearThere  &&  !(year1Okay && year2Okay) )
            tryAgain = true;

        if (!tryAgain){
           //jQuery('#facet_date_range_div input').each(function(){
           outerDiv.find('input').each(function(){
                var oThis = jQuery(this);
                var val = oThis.ncbiplaceholder().ncbiplaceholder('value'); //.val();
                var fieldSize = oThis.attr('size');
                if(this.id.match('month')){
                    if (!val.match(new RegExp('^\\d{0,' + fieldSize + '}$')) )
                        tryAgain = true;
                    else if (val == '' )
                        val = this.id.match("end") ? '12' : '01' ;
                    else if (val.length == 1) 
                        val = '0' + val;
                    else if (Number(val) > 12)
                        tryAgain = true;
                }
                else if(this.id.match('day')){
                    if (!val.match(new RegExp('^\\d{0,' + fieldSize + '}$')) )
                        tryAgain = true;
                    else if (val == '' )
                        val = this.id.match("end") ? '31' : '01' ;
                    else if (val.length == 1) 
                        val = '0' + val;
                    else if (Number(val) > 31)
                        tryAgain = true;
                }
                dateRangeVals.push(val);
            });
        }
	    if (tryAgain){
	        alert('please enter a valid date range');
	        return;
	    }
	    var filterId = outerDiv.closest('ul.facet').data('filter_id');
	    dateRange = filterId + '_' + dateRangeVals[0] + '/' + dateRangeVals[1] + '/' + dateRangeVals[2] + '_' + dateRangeVals[3] + '/' + dateRangeVals[4] + '/' + dateRangeVals[5];
	    e.data.thisObj.handleFilterSelection({'filterId':filterId,'valueId':dateRange,'checkOn':true,'dateSearch':true});
	    outerDiv.data('attached-to').ncbipopper('close');
	},
	'facetFieldsApplyClicked':function(e){
	    e.preventDefault();
	    var val = jQuery('#facet_fileds_select').val();
	    //var currFilterString = window.location.search.match(/filters=([^&]*)/);
	    var currFilterString = e.data.thisObj.getCurrentFilterString();
	    if (currFilterString.match(/fld_.+/)){
	        currFilterString = currFilterString.replace(/fld_.[^;]+/,val);       
	    }
	    else
	        currFilterString = (currFilterString != '') ? currFilterString + ';' + val : val; 
	    Portal.$send('FacetFilterSet',{'FacetsUrlFrag':e.data.thisObj.getNewUrlFrag(currFilterString)});
	},
	'removeFieldSelection':function(){
	    //var currUrl = window.location.pathname + window.location.search ;
	    var currUrl = this.getValue('FacetsUrlFrag');
         if (currUrl.match(/;fld_.[^;]+/))
             currUrl = currUrl.replace(/;fld_.[^;]+/,'');
         else if (currUrl.match(/fld_.[^;]+;/))
             currUrl = currUrl.replace(/fld_.[^;]+;/,'');
         else if (currUrl.match(/fld_.[^;]+/))
             currUrl = currUrl.replace(/fld_.[^;]+/,''); 
         currUrl = this.getNewUrlFrag(currUrl);
         Portal.$send('FacetFilterSet',{'FacetsUrlFrag':currUrl});
         //window.location = currUrl;
	},
	'onMoreFiltersOpen':function(e){
	    var targetNode = jQuery(this);
	    var popper = jQuery(targetNode.attr('href'));
	    var filterId = targetNode.closest("ul.facet").data('filter_id');
	    var facetUl = e.data.thisObj.jFacetObj.find('ul[data-filter_id = "' + filterId + '"]');
	    var selFilters = facetUl.find('li.fil_val a');
	    selFilters = selFilters.add(facetUl.find('li.of_fil_val a'));
	    selFilters.each(function(){
	        var self = jQuery(this);
	        popper.find('li input[data-value_id = "' + jQuery(this).data('value_id') + '"]').attr('checked','checked');
	        }); 
	    var activeFilters = selFilters.filter(function(){return jQuery(this).parent().hasClass("selected");});
	    activeFilters.each(function(){
	        popper.find('li input[data-value_id = "' + jQuery(this).data('value_id') + '"]').attr('disabled','true');
	    });
	},
	'facetDialogKeyPress':function(e){
	    e = e || utils.fixEvent (window.event);
	    if ((e.keyCode || e.which) == 13){
	        e.preventDefault();
	        jQuery(this).find('button.primary-action').trigger('click');
	    }
	},
	'autoFillDateInputs':function(e){
	    var oThis = jQuery(this);
	    var outerDiv = oThis.closest('[id^=facet_date_range_div]');
	    function updateVal(jSel,value){
	        jSel.each(function(){ var oThis = jQuery(this); if (oThis.val() == '') oThis.val(value);});
	    }
	    if (oThis.val().match(new RegExp('^\\d{' + oThis.attr('size') +'}$'))){
	        var currId = oThis.attr('id');
	        if( currId.match(/^facet_date_st_year/))
	            updateVal(outerDiv.find('[id^=facet_date_st_month], [id^=facet_date_st_day]'),'01');
	        else if (currId.match(/^facet_date_st_month/))
	            updateVal(outerDiv.find('[id^=facet_date_st_day]'),'01');    
	        else if (currId.match(/^facet_date_end_year/)){
	            updateVal(outerDiv.find('[id^=facet_date_end_month]'),'12');
	            updateVal(outerDiv.find('[id^=facet_date_end_day]'),'31');
	        }
	        else if (currId.match(/^facet_date_end_month/))
	            updateVal(outerDiv.find('[id^=facet_date_end_day]'),'31'); 
	    }
	},
	'dateRangeClearClicked':function(e){
	    e.preventDefault();
	    var self = jQuery(e.target);
	    if (self.closest('ul').has('li.daterange').find('li.selected')[0])
	        e.data.thisObj.handleFilterSelection({'filterId':self.closest('ul.facet').data('filter_id'),'valueId':'','checkOn':true,'dateSearch':true});
	    else
	        self.closest('.facets_dialog').find('input').val('');
	},
	'rangeClearClicked':function(e){
	    e.preventDefault();
	    e.data.thisObj.handleFilterSelection({'filterId':jQuery(e.target).closest('ul.facet').data('filter_id'),'valueId':'','checkOn':true,'rangeSearch':true});
	},
	'resetFromMessage':function(e){
	    e.preventDefault();
	    Portal.$send('FacetFiltersCleared',{});
	},
	'resetFromMessageRes':function(e){
	    e.preventDefault();
	    Portal.$send('FacetFilterSet',{'FacetsUrlFrag': 'fcl=all'});
	},
	'getFacetSearchData':function(){
	    var sd = {};
	    try{
	        sd = eval('({' + this.jFacetObj.data('sd') + '})');
	    }catch(e){}
	    return sd;
	},
	'handleFacetFilterSet':function(facetsUrlFrag,bMFacets){
	    var sd = this.getFacetSearchData();
	    this.setValue('FacetsUrlFrag',facetsUrlFrag);
	    this.setValue('FacetSubmitted','true');
	    this.setValue('BMFacets',bMFacets);
	    this.send.SetTimelineFilter({'TimelineYear':''});
	    if(sd.extra){
	        this.handleExtraSD(sd.extra);
	    }
	    else if (sd.op == 'search'){
	        this.send.SendSearchBarTerm();
	        this.send.Cmd({'cmd':'search'});    
	    }
	    else if (sd.op == 'link' && sd.linkname && (sd.qk || sd.idsfromresult) ){
	        this.send.LinkName({'linkname':sd.linkname});
	        this.send.QueryKey({'qk':sd.qk});
	        this.send.IdsFromResult({'IdsFromResult':sd.idsfromresult});
	        this.send.Cmd({'cmd':'Link'});    
	    }
	    else{
	        this.send.Cmd({'cmd':'HistorySearch'});
	        this.send.QueryKey({'qk':sd.qk});
	    }

	    Portal.requestSubmit();
	},
	'handleExtraSD':function(extraSD){
	    alert('Please implement the function handleExtraSD');    
	},
	'handleFacetFiltersCleared':function(){
	    this.send.Cmd({'cmd': 'removefacets'});
		Portal.requestSubmit();
	},
	'openFieldSelected':function(e){
	    e.preventDefault();
        e.data.thisObj.addOpenFieldValue(jQuery(e.target).closest('ul.facet'));
	},
	'openFieldAddClicked':function(e){
	    e.preventDefault();
	    e.data.thisObj.addOpenFieldValue(jQuery(e.target).closest('ul.facet'));
	},
	'openFieldKeyPress':function(e){
	    //e.data.thisObj.openFieldChanged(e);
	    e = e || utils.fixEvent (window.event);
	    if ((e.keyCode || e.which) == 13){
	        e.preventDefault();
	        e.data.thisObj.addOpenFieldValue(jQuery(e.target).closest('ul.facet'));
	    }
	},
	'openFieldChanged':function(e){
	    var self = jQuery(this);
	    var applyBtn = self.closest('.facets_dialog').find('.facet_more_apply');
	    if(self.val() == ''){
	        applyBtn.find('span').text('Show');
	    }
	    else{
	        applyBtn.find('span').text('Add');
	    }
	},
	'checkSelOnlyOpenField':function(input,showAlert){
	      showAlert = showAlert || 'yes';
	      var isInDict = false;
	      var inputText = input.val().toLowerCase();
	      if(input.data('so') == 'yes'){
	          var jigOpts = input.data('jigconfig').match(/dictionary:'(\w+)'.*/);
	          var dict = jigOpts ? jigOpts[1] : null;
	          jigOpts = input.data('jigconfig').match(/localData:(')?([^,]*)(')?/);
	          var localDict = jigOpts ? jigOpts[2] : null;
	          if (dict){
	              var ajaxCall = jQuery.ajax({
	                  url:'/portal/utils/autocomp.fcgi?dict=' + dict + '&q=' + inputText,
	                  async:false,
	                  dataType:'json'
	              }).always(function(data){
	                  isInDict = eval(data.responseText);
	                  //the handling function with local scope only
	                  function NSuggest_CreateData(q,matches,count){
	                      var rg = new RegExp('^' + inputText + '(@.*)?$','i');
	                      return jQuery.grep(matches,function(e,i){
	                          return rg.exec(e);
	                          }).length > 0;
	                  }
	              });
        	      if (!isInDict && showAlert == 'yes')
	                  alert('Please select one of the valid values');
	              return isInDict;
	           }
	           else if (localDict){
	               var localDictSplitted = localDict.split('.');
	               var localDictVar = null;
	               for(var i=0; i<localDictSplitted.length; i++){
	                   if (localDictVar == null)
	                       localDictVar = window[localDictSplitted[i]];
	                    else
	                        localDictVar = localDictVar[localDictSplitted[i]];
	               }
	               var rg = new RegExp('^' + inputText + '$', 'i');
	               jQuery.each(localDictVar,function(ind,val){
	                   if (val.match(rg))
	                       isInDict = true;
	               });
                 if (!isInDict && showAlert == 'yes')
	                  alert('Please select one of the valid values');
	              return isInDict;
	           }
	           else
	               return true;
	       }
	       else
	           return true;
	},
	'addOpenFieldValue':function(facetUl){
	    var inputBox = facetUl.find(".of_sel_inp");
	    var newVal = inputBox.val();
	    if(newVal){
            if(!this.checkSelOnlyOpenField(inputBox)){
	            return;
	        }
	        var listUl = facetUl.find('.facets_dialog ul.facet_more');
	        if (listUl.find('li').has('input[data-value_id="' + newVal +'"]').size() == 0 ){ 
                inputBox.val('');
    	        var elId = 'ofv_' + newVal;
    	        listUl.append('<li data-value_id="of_val"><input type="checkbox" id="'+ elId +'" checked="checked" data-value_id="' + newVal + '" ><label for="'+elId+'">' + newVal +'</label></li>');
    	        inputBox.focus();
	        }
	        else{
	            alert('Already added');
	            inputBox.focus();
	        }
	    }
	    else{
	        facetUl.find('.facet_more_apply').trigger('click');
	    }
	},
	'getCurrentFilterString':function(){
	    var currFilterString = this.getValue('FacetsUrlFrag').match(/filters=([^&]*)/);
	    return currFilterString ? currFilterString[1] : ''; 
	},
	'applyOpenField':function(elem,filterId){
        var currFilterString = this.getCurrentFilterString();
        var paramVal = '';
        var newVal = elem.data('value_id');
        var dupl = false;
        var facetUl = elem.closest('ul.facet');
        facetUl.find('li.selected').not(".fil_val").each(function(){
            var currVal = jQuery(this).find('a').data('qval');
            if (newVal.match(new RegExp('^' + currVal + '$','i')))
                dupl = true;
            paramVal = paramVal + ( paramVal == '' ? '' : ':' ) + currVal ;
        });
        if (dupl)
            return;
        paramVal = paramVal == '' ? newVal : paramVal + ':' + newVal;
        currFilterString = this.replaceUrlParamFrag(currFilterString,'of_' + filterId,paramVal,';');
    	    
        
        var bmFacets = '';
        var facetUl = elem.closest('ul.facet');
        if (facetUl.data('bm') == 'yes'){
            bmFacets = 'bmf=' + facetUl.data('filter_id') + ':' +
                jQuery.makeArray(facetUl.find('li a').map(function(){return (jQuery(this).data('value_id'))})).join(';');
        }
        	    
        Portal.$send('FacetFilterSet',{'FacetsUrlFrag':this.getNewUrlFrag(currFilterString),'BMFacets':bmFacets});
	},
	'removeOpenField':function(elem,filterId){
	    var currFilterString = this.getCurrentFilterString();
	    var valueId = elem.data('value_id');

            
        var toReplace = currFilterString.match(new RegExp('of_' + filterId + '=(.[^;]*)'));
        toReplace = toReplace ? toReplace[1] : '';
        var replaceWith = '';
        if (valueId != ''){
            var toRemove = elem.data('qval');
            replaceWith = toReplace;
            var rg;
            rg = new RegExp(':' + toRemove);
            if(rg.exec(replaceWith))
                replaceWith = replaceWith.replace(rg,'');
            else{
                rg = new RegExp(toRemove + ':');
                if (rg.exec(replaceWith))
                    replaceWith = replaceWith.replace(rg,'');
                else{
                    replaceWith = replaceWith.replace(new RegExp(toRemove),'');
                }
            }
            
            
        }
        currFilterString = this.replaceUrlParamFrag(currFilterString,'of_' + filterId,replaceWith,';')
        this.setValue('FacetsUrlFrag',"filters=" + currFilterString);
        this.handleFilterSelection({'filterId':filterId,'valueId':valueId,'checkOn':true});
	},
	'ShowAllFacetsToggle':function(e){
	    var elem = jQuery(e.target);
	    if (elem.hasClass('fetch_more_exp')){
	        elem.removeClass('fetch_more_exp');
	        elem.addClass('fetch_more_exp_less');
	        if (isNaN(parseInt(elem.data("sz"),10)))
	            elem.data("sz",elem.parent().parent().find("li.fil_val:visible").size());
	        var moreFacets = elem.next('ul').find('li');
	        moreFacets.insertBefore(elem.parent());
	    }
	    else{
	        elem.removeClass('fetch_more_exp_less');
	        elem.addClass('fetch_more_exp');
	        var sz = parseInt(elem.data("sz"),10);
	        moreFacets = elem.parent().parent().find("li.fil_val").filter(function(i){return i >= sz;});
	        elem.next().append(moreFacets);
	    }
	}
}
);
;
Portal.Portlet.Sequence_Facets = Portal.Portlet.Entrez_Facets.extend ({
  
	init: function (path, name, notifier) 
	{ 
		this.base (path, name, notifier);		
	}/*,
	"getPortletPath" : function(){
	    //return "EntrezSystem2.PEntrez.Protein.Sequence_Facets";
	    //return (this.realname + ".Entrez_Facets");
	    return this.realname; 
	}*/
}
);



;
Portal.Portlet.Entrez_DisplayBar = Portal.Portlet.extend({

	init: function(path, name, notifier) {
		console.info("Created DisplayBar");
		this.base(path, name, notifier);
		
		// for back button compatibility reset values when page loads
		if (this.getInput("Presentation")){
		    this.setValue("Presentation", this.getValue("LastPresentation"));
		    Portal.Portlet.Entrez_DisplayBar.Presentation = this.getValue("LastPresentation");
		}
		if (this.getInput("Format")){
		    this.setValue("Format", this.getValue("LastFormat"));
		    Portal.Portlet.Entrez_DisplayBar.Format = this.getValue("LastFormat");
		}
		if (this.getInput("PageSize")){
		    this.setValue("PageSize", this.getValue("LastPageSize"));
		    Portal.Portlet.Entrez_DisplayBar.PageSize = this.getValue("LastPageSize");
		}
		if (this.getInput("Sort")){
		    this.setValue("Sort", this.getValue("LastSort"));
		    Portal.Portlet.Entrez_DisplayBar.Sort = this.getValue("LastSort");
		}
		this.ResetDisplaySelections();
		this.ResetSendToSelection();
		
    	jQuery( 
            function(){
        
                var animationTime = jQuery("#sendto2").ncbipopper("option","openAnimationTime");
                var currentCnt = 0;
                var expTimer;
        
                function testPosition(){
                    jQuery(window).trigger("ncbipopperdocumentresize");
                    currentCnt+=10;
                    if (currentCnt<animationTime) {
                        expTimer = window.setTimeout(testPosition,10);
                    }
                }
        
                jQuery("#send_to_menu2 input").on("change click", 
                    function(){
                        currentCnt = 0;
                        if(expTimer) window.clearTimeout(expTimer);
                        testPosition();
                    } 
                );
        
            }
        );
		        
	},
	
	
	send: {
		'Cmd': null, 
		'PageSizeChanged': null,
		'ResetSendTo': null,
		'ResetCurrPage': null,
		'AddUserMessage': null
	},
		
	
	listen: {
		
		/* browser events */
			
		"sPresentation<click>": function(e, target, name){
		    this.PresentationClick(e, target, name); 
		},
		
		"sPresentation2<click>": function(e, target, name){
		    this.PresentationClick(e, target, name); 
		},
		
		"sPageSize<click>": function(e, target, name){	
		    this.PageSizeClick(e, target, name);
		},
		
		"sPageSize2<click>": function(e, target, name){	
		    this.PageSizeClick(e, target, name);
		},
		
		"sSort<click>": function(e, target, name){
		    this.SortClick(e, target, name);
		},
		
		"sSort2<click>": function(e, target, name){
		    this.SortClick(e, target, name);
		},
		
		"SetDisplay<click>": function(e, target, name){
			this.DisplayChange(e, target, name); 
		},
		
		"SendTo<click>": function(e, target, name){
			var sendto = target.value;
            var idx = target.getAttribute('sid') > 10? "2" : "";
			this.SendToClick(sendto, idx, e, target, name); 
		},
		
		"SendToSubmit<click>": function(e, target, name){
		    e.preventDefault();
		    var cmd = target.getAttribute('cmd').toLowerCase();
		    var idx = target.getAttribute('sid') > 10? "2" : "";
			this.SendToSubmitted(cmd, idx, e, target, name); 
		},
		
		/* messages from message bus*/
		
		'ResetSendTo' : function(sMessage, oData, sSrc) {
		    this.ResetSendToSelection();
		}
	
	}, // end listen
	
	
	
	/* functions */
	
	'PresentationClick': function(e, target, name){
		Portal.Portlet.Entrez_DisplayBar.Presentation = target.value;
		Portal.Portlet.Entrez_DisplayBar.Format = target.getAttribute('format');
		this.DisplayChange();
	},
	
	'PageSizeClick': function(e, target, name){ 
		Portal.Portlet.Entrez_DisplayBar.PageSize = target.value;
		this.DisplayChange();
	},
	
	'SortClick': function(e, target, name){
		Portal.Portlet.Entrez_DisplayBar.Sort = target.value;
		this.DisplayChange();
	},
	
	'DisplayChange': function(e, target, name){
	    var submit = false;
	    var extractdb = window.location.pathname.match(/\/([A-Za-z]+)\/?/); 
	    var db = (extractdb[1] && extractdb[1] != '') ? extractdb[1] : "";
	    
	    if (db != '' && getEntrezSelectedItemCount() == 1){
	        //get id, attach db and report, and link	        
	        var URL = '/' + db + '/' + getEntrezSelectedItemList() + '?report=' + Portal.Portlet.Entrez_DisplayBar.Presentation
	        + (Portal.Portlet.Entrez_DisplayBar.Format.toLowerCase() == 'text' ? '&format=text' : '');
	        window.location = URL;
	    }
	    else if (db != '' && getEntrezResultCount() == 1 && window.location.href != ""){   
	        //remove report= from URL and insert new report= into URL
	        if ((window.location.pathname != '' && window.location.pathname.match(/\/[A-Za-z]+\/\w*\d+\w*/))
	            || window.location.href.match(/\/[A-Za-z]+\/??.*term=[^&\s]+/)
	        ){
	            var URL = window.location.href.replace(/&?report=\w+/, "").replace(/\?&/, "?");
	            var hashtagindex = URL.indexOf("#");
	            if (hashtagindex >= 0){
	                URL = URL.substring(0, hashtagindex);
	            }
	            URL += (URL.match(/\?/) ? (URL.match(/\?[^\s]+/) ? "&" : "") : "?") 
	                + "report=" + Portal.Portlet.Entrez_DisplayBar.Presentation
	                + (Portal.Portlet.Entrez_DisplayBar.Format.toLowerCase() == 'text' ? '&format=text' : '');
	            window.location = URL;    
	        }
	        else {
	            submit = true;
	        }
	    }
	    else{
            submit = true;
        }
        
        if (submit){
            this.send.Cmd({'cmd': 'displaychanged'});
            
    	    this.SetPresentationChange(e, target, name);
    	    this.SetPageSizeChange(e, target, name);
    	    this.SetSortChange(e, target, name);
    	    
    	    Portal.requestSubmit();
	    }
	},
	
	'SetPresentationChange': function(e, target, name){
        this.setValue("Presentation", Portal.Portlet.Entrez_DisplayBar.Presentation);
	    this.setValue("Format", Portal.Portlet.Entrez_DisplayBar.Format);
	},
	
	'SetPageSizeChange': function(e, target, name){
	    this.setValue("PageSize", Portal.Portlet.Entrez_DisplayBar.PageSize);
		if (this.getValue("PageSize") != this.getValue("LastPageSize")){
    		//send PageSizeChanged
    		this.send.PageSizeChanged({
    			'size': this.getValue("PageSize"),
                'oldsize': this.getValue("LastPageSize")
    		});	
		}
	},
		
	'SetSortChange': function(e, target, name){
	    if (this.getInput("Sort")){
	        this.setValue("Sort", Portal.Portlet.Entrez_DisplayBar.Sort);
            if (this.getValue("Sort") != this.getValue("LastSort")){
                // ask to reset CurrPage 
    		    this.send.ResetCurrPage();
    		}
    		
    		// set sort in cookie   		
    		var extractdb = window.location.pathname.match(/\/([A-Za-z]+)\/?/); 
    	    var db = (extractdb[1] && extractdb[1] != '') ? extractdb[1] : "";
    	    
    		this.SetSortCookie(Portal.Portlet.Entrez_DisplayBar.Sort, db);
        }    	
	},
		
	'SendToClick': function(sendto, idx, e, target, name) {
		if(sendto.toLowerCase() == 'file'){
			this.SendToFile(sendto, idx);
		}
		else if(sendto.toLowerCase() == 'addtocollections'){
			this.SendToCollections(sendto, idx);
		}
		else if(sendto.toLowerCase() == 'addtoclipboard'){
		    this.SendToClipboard(sendto, idx);
		}
		else if (sendto.toLowerCase() == 'addtobibliography'){
	        this.SendToBib(sendto, e, target);
	    }
	},
	
	'SendToSubmitted': function(cmd, idx, e, target, name){
	    if (cmd == 'addtobibliography'){
	    	this.SendToBibliographySubmitted(e, cmd, idx, target);
	    }
	    else {
    	    if (cmd == 'file'){
    	         this.SendToFileSubmitted(cmd, idx, target);
    	    }
    	    else if (cmd == 'addtocollections'){
    	    	this.SendToCollectionsSubmitted(cmd, idx, target);
    	    }
    	    this.send.Cmd({'cmd': cmd});
    	    Portal.requestSubmit();
        }       
	},
	
	'ResetSendToSelection': function(){
	    var SendToInputs = this.getInputs("SendTo");
	    for (var j = 0; j < SendToInputs.length; j++){
		    if (SendToInputs[j].checked){
		        SendToInputs[j].checked = false;
			}
		}
	},
	
	'SendToFile': function(name, idx){
	    // generate content
	    var count = this.getItemCount();
		var content = 'Download ' + count + ' items.';
		this.addSendToHintContent(name, idx, content);
	},
	
	'SendToCollections': function(name, idx){
	    // generate content
        var count = this.getItemCount();
        var content= 'Add ';
        var optionNode = document.getElementById("coll_start_option" + idx);
        if (count > Portal.Portlet.Entrez_DisplayBar.CollectionsUpperLimit){
            content += Portal.Portlet.Entrez_DisplayBar.CollectionsUpperLimitText;
            if (optionNode){
            	optionNode.className = '';
            }
        }
        else{
            content += count;
            if (optionNode){
            	optionNode.className = 'hidden';
            }
        }
        content += " items.";
        this.addSendToHintContent(name, idx, content);	
	},
	
	'SendToBib': function(name, e, target){
	    jQuery('#submenu_AddToBibliography').addClass('hidden')
	    // generate content
        var count = this.getItemCount();
        var content= 'Add ';
        if (count > Portal.Portlet.Entrez_DisplayBar.BibUpperLimit){
            content += "the first " + Portal.Portlet.Entrez_DisplayBar.BibUpperLimit;
        }
        else{
            content += count;
        }
        content += " items.";
        this.addSendToHintContent(name, "", content);	
        
        // fetch other bibliography options
        var oThis = this;	
        jQuery.ui.jig.requiresLoginURL = "/account/signin/?inlinelogin=true&popuplogin=true";
        // set the menu behind myncbi login
        jQuery(target).closest('.send_to').css('z-index', '100');
        jQuery.ui.jig.requiresLogin( function(name, requiredLogin){ 
            // restore menu position after login
            jQuery(target).closest('.send_to').css('z-index', '200');
            // display message showing collection list
            jQuery('.bib_list column_list').addClass('hidden');
            jQuery('#submenu_AddToBibliography').removeClass('hidden')
            jQuery('#submenu_AddToBibliography_msg').removeClass('hidden'); 
            // fetch collection list
            var site = document.forms[0]['p$st'].value;
            xmlHttpCall(site, oThis.getPortletPath(), "GetBibliographyList", {}, oThis.ShowBibliographyList, {}, oThis);
        });
	},
	
	'SendToClipboard': function(name, idx){
	    // generate content
	    var count = this.getItemCount();
        var content= 'Add ';
        if (count > Portal.Portlet.Entrez_DisplayBar.ClipboardLimit){
            content += "the first " + Portal.Portlet.Entrez_DisplayBar.ClipboardLimit;
        }
        else{
            content += count;
        }
        content += " items.";
        this.addSendToHintContent(name, idx, content);
	},
	
	'getItemCount': function(){
	    // ask for selected items count from DbConnector
	    var selectedItemCount = getEntrezSelectedItemCount();
	    if (selectedItemCount > 0){
	        return selectedItemCount;
	    }
	    else{
	        // ask for result count from Entrez_ResultsController
	        return getEntrezResultCount();
	    }
	},
	
	'addSendToHintContent': function(name, idx, content){
	    var hintNode = document.getElementById("submenu_" + name + "_hint" + idx);
	    if (hintNode){
	        hintNode.innerHTML = content;
	        hintNode.className = 'hint';
	    }
	},
	
	'AddSendToSubmitEvent': function(){
	    // add event for SendTo submit button click. 
	    // This call is needed if the position of the submit button node has changed in relation to its parent node. 
        this.addEvent("SendToSubmit", "click", function(e, target, name) {
            var cmd = target.getAttribute('cmd');
            this.SendToSubmitted(cmd, e, target, name); 
        }, false);
    },
    
    'SendToFileSubmitted': function(cmd, idx, target){
         if (this.getInput("FFormat" + idx)){
             this.setValue("FileFormat", this.getValue("FFormat" + idx));
         }
         if (this.getInput("FSort" + idx)){
             this.setValue("FileSort", this.getValue("FSort" + idx));
         }
    },
    
    'SendToCollectionsSubmitted': function(cmd, idx, target){
         if (document.getElementById("coll_start" + idx)){
             document.getElementById("coll_startindex").value = document.getElementById("coll_start" + idx).value;
         }
    },
    
    'SendToBibliographySubmitted': function(e, cmd, idx, target){ 
        var oThis = this;	
        jQuery.ui.jig.requiresLoginURL = "/account/signin/?inlinelogin=true&popuplogin=true";
        jQuery.ui.jig.requiresLogin( function(name, requiredLogin){ 
            // update which bibliography to update
	        oThis.send.Cmd({'cmd': cmd});
	        oThis.send.AddUserMessage({'type': 'info', 
	                                    'name': 'mybib_processing_msg',
	                                    'msg': 'Adding items to bibliography ...'});
	        Portal.requestSubmit();
	        // Hack to directly make portal submit the page from async function call requiresLogin
	        // By the time asnc function finishes execution portal is not looking for submit request. It's too long after an event firing.
	        // Investigated by Mark Johnson, on 1/17/2019
	        d = Dispatcher.getInstance();
            d.submit();
	    }); 
    },
    
    'ResetDisplaySelections': function(){
        if (this.getInput("Presentation")){
            var selection = this.getValue("Presentation").toLowerCase() + this.getValue("Format").toLowerCase();
            if (document.getElementById(selection)){
                document.getElementById(selection).checked = true;
            }
            // bottom display bar
            if (document.getElementById(selection + "2")){
                document.getElementById(selection + "2").checked = true;
            }
            
        }
        if (this.getInput("PageSize")){
            var selection = 'ps' + this.getValue("PageSize");
            if (document.getElementById(selection)){
                document.getElementById(selection).checked = true;
            }
            // bottom display bar
            if (document.getElementById(selection + "2")){
                document.getElementById(selection + "2").checked = true;
            }
        }
        if (this.getInput("Sort")){
            var selection = this.getValue("Sort") || 'none'; 
            if (document.getElementById(selection)){
                document.getElementById(selection).checked = true;
            }
            // bottom display bar
            if (document.getElementById(selection + "2")){
                document.getElementById(selection + "2").checked = true;
            }
        }
    },
    
    'SetSortCookie': function(sort, db){
	    if (db != ''){
            var d = new Date();
            d.setTime(d.getTime() + (365*24*60*60*1000));
            var expires = "expires="+d.toUTCString();
            
            var newCookie = db + ":" + sort;
            var oldCookie = this.getCookie('entrezSort');
            if (oldCookie != ''){
                if (oldCookie.indexOf(db) != -1){
                    var oldSortVal = oldCookie.substring(oldCookie.indexOf(db));
                    if (oldSortVal.indexOf('&') != -1){
                        oldSortVal = oldSortVal.substring(0, oldSortVal.indexOf('&'));
                    }
                    newCookie = oldCookie.replace(oldSortVal, newCookie);
                }
                else{
                    newCookie = newCookie + "&" + oldCookie;
                }
            } 
            newCookie = "entrezSort=" + newCookie + ";domain=.ncbi.nlm.nih.gov;path=/;" + expires;
            document.cookie = newCookie;
            
		}
    },
    
    // from http://www.w3schools.com/js/js_cookies.asp
    'getCookie': function (cname) {
        var name = cname + "=";
        var ca = document.cookie.split(';');
        console.info("cookie count: " + ca.length);
        for(var i=0; i<ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0)==' ') c = c.substring(1);
            if (c.indexOf(name) == 0) return c.substring(name.length,c.length);
        }
        return "";
    },
    
    'getPortletPath': function(){
        return this.realname;
    },
    
    'ShowBibliographyList': function(responseObject, userArgs){
        try {
            // Handle timeouts
            if (responseObject.status == 408) {
                //this.showMessage("Server currently unavailable. Please check connection and try again.","error");
                console.warn("Server currently unavailable. Please check connection and try again.");
            }
            else{
                var resp = '(' + responseObject.responseText + ')';
                var JSONobj = eval(resp);
                var bibList = JSONobj.BibliographyList; 
                jQuery('.mybib_list').replaceWith(bibList); 
                jQuery(".mybib_list input").on("click", function(){
                    if(jQuery(this).prop('checked')){
                        var user = jQuery(this).data('bib-id');
                        var bibName = jQuery(this).val(); 
                        jQuery('#submenu-bib-user').val(user); 
                        jQuery('#submenu-bib-name').val(bibName); 
                    }
                });
            }                       
        } catch (e) {
            //this.showMessage("Server error: " + e, "error");
            console.warn("Server error: " + e);
        }
        // in case of error, just default list will  be shown
        jQuery('#submenu_AddToBibliography_msg').addClass('hidden');  
        jQuery('.bib_list column_list').removeClass('hidden');
    }
	
},
{
    Presentation: '',
    Format: '',
    PageSize: '',
    Sort: '',
    CollectionsUpperLimit: 1000,
	CollectionsUpperLimitText: '1,000',
	ClipboardLimit: 500,
	BibUpperLimit: 200
});



;
Portal.Portlet.Sequence_DisplayBar = Portal.Portlet.Entrez_DisplayBar.extend({
    // see also requests to viewer.cgi at Portal.Portlet.Sequence_ViewerReport
    
    init: function (path, name, notifier) {
        console.info("Created Sequence_DisplayBar");
        this.base(path, name, notifier);
        this.AddListeners(notifier);
    },
    
    send: {
        'Cmd': null,
        'PageSizeChanged': null,
        'ResetSendTo': null,
        'ResetCurrPage': null,
        'SendSavedUidList': null,
        'ViewerParams': null,
        'SendSavedAccnList': null
    },
    
    "AddListeners": function (notifier) {
        var oThis = this;
        
        notifier.setListener(this, 'SavedUidList',
        function (oListener, custom_data, sMessage, oNotifierObj) {
            oThis.SavedUidListMsg(custom_data);
        },
        null);
        
        notifier.setListener(this, 'SavedAccnList',
        function (oListener, custom_data, sMessage, oNotifierObj) {
            oThis.SavedAccnListHandler(custom_data);
        },
        null);
        
        notifier.setListener(this, 'SelectedRegion',
        function (oListener, custom_data, sMessage, oNotifierObj) {
            oThis.SelectedRegionMsg(custom_data);
        },
        null);
        
        notifier.setListener(this, 'Bitmask',
        function (oListener, custom_data, sMessage, oNotifierObj) {
            oThis.BitmaskMsg(custom_data);
        },
        null);
        
        notifier.setListener(this, 'Customized',
        function (oListener, custom_data, sMessage, oNotifierObj) {
            Portal.Portlet.Sequence_DisplayBar.customized = true;
        },
        null);
        
        notifier.setListener(this, 'SetPresentation',
        function (oListener, custom_data, sMessage, oNotifierObj) {
            oThis.SetPresentation(custom_data);
        },
        null);
    },
    
    'DisplayChange': function (e, target, name) {
        if (this.getValue('ResultCount') * 1 == 1) {
            
            var report = Portal.Portlet.Entrez_DisplayBar.Presentation;
            var url = '/' + this.getValue('Db') + '/' + this.getValue('Id') + '?report=' + report + '&log$=seqview';
            if (Portal.Portlet.Entrez_DisplayBar.Format == 'text') {
                url += '&format=text';
            }
            
            if (this.getInput('ExpandGaps') === "on") {
                url += '&expand-gaps=on';
            }
            // for revision history
            if (report.match(/girevhist/)) {
                window.location = '/' + this.getValue('Db') + '/' + this.getValue('Id') + '?report=girevhist';
            }
            // for reports that cannot be customized, just send URL
            else if (report.match(/docsum|gilist|accnlist/)) {
                window.location = url;
            }
            // if Customize portlet was used and the new report will have a customize portlet, then
            //submit the form to get all parameters from POST, otherwise go to the URL
            else if (Portal.Portlet.Sequence_DisplayBar.customized &&
            report.match(/fasta|genbank|genpept|asn1|gbwithparts|gpwithparts/) &&
            Portal.Portlet.Entrez_DisplayBar.Format != 'text') {
                // not fasta text
                
                this.send.Cmd({
                    'cmd': 'displaychanged'
                });
                this.SetPresentationChange(e, target, name);
                this.SetPageSizeChange(e, target, name);
                this.SetSortChange(e, target, name);
                Portal.requestSubmit();
            }
            // If it is the graphical report and user has customized the current report, send strand only.
            else if (Portal.Portlet.Sequence_DisplayBar.customized && report.match(/graph/)) {
                window.location = url + Portal.Portlet.Sequence_DisplayBar.regionUrlSeg +
                Portal.Portlet.Sequence_DisplayBar.optionsUrlSegForGraph;
            }
            // if current report is graph, send all options in URL
            else if (this.getValue("LastPresentation") == 'graph') {
                var urlfrag = SeqView.PortalSeqGraphicsInfo().match(/from=(\d*)&to=(\d*)&itemid=(\d*)&strand=(true|false)/) || "";
                var from = urlfrag[1] && urlfrag[1] != 1 ? "&from=" + urlfrag[1]: "";
                var to = urlfrag[2] ? "&to=" + urlfrag[2]: "";
                var itemid = urlfrag[3] ? "&itemid=" + urlfrag[3]: "";
                var strand = (urlfrag[4] == 'true') ? "&strand=true": "";
                
                window.location = url + from + to + itemid + strand;
            }
            
            // For reports that do not have a customized portlet -it means it cannot understand the customizations,
            // so, no need to send them the bitmask related data. On the other hand, for reports that have a
            // customize portlet, but there were no customizations, they can use the default settings. Do pass
            // along any fmt_mask parameter from the URL though.
            else {
                if (this.getInput('Sat')) {
                    url += '&sat=' + this.getValue('Sat');
                }
                if (this.getInput('SatKey')) {
                    url += '&satkey=' + this.getValue('SatKey');
                }
                
                if (this.getInput('Location')) {
                    url += '&location=' + this.getValue('Location');
                }
                
                if (report.match(/fasta/) && Portal.Portlet.Entrez_DisplayBar.Format == 'text') {
                    // for fasta text, only send strand from customize portlet, sinc ethat's the only option available for fasta
                    window.location = url + Portal.Portlet.Sequence_DisplayBar.regionUrlSeg +
                    Portal.Portlet.Sequence_DisplayBar.optionsUrlSegForGraph;
                } else {
                    window.location = url + Portal.Portlet.Sequence_DisplayBar.regionUrlSeg 
                    // + Portal.Portlet.Sequence_DisplayBar.urlFmtMaskUrlSeg;
                }
            }
        } else {
            this.base(e, target, name);
        }
    },
    
    'SendToSubmitted': function (cmd, idx, e, target, name) {
        //alert(cmd)
        if (cmd == 'codeseq') {
            this.SendToCodingSequences(cmd, idx, target);
        } else if (cmd == 'file') {
            this.SendToFileSubmitted(cmd, idx, target);
        } else if (cmd == 'analysistool') {
            this.SendToAnalysisToolSubmitted(cmd, idx, target);
        } else if (cmd == 'genefeat') {
            this.SendToGeneFeaturesSubmitted(cmd, idx, target);
        } else {
            this.base(cmd, idx, e, target, name);
        }
    },
    'SendToGeneFeaturesSubmitted': function (cmd, idx, target) {
        //if (this.getInput("GFFormat" + idx)){
        Portal.Portlet.Sequence_DisplayBar.dlreport = "gene_fasta"; //this.getValue("GFFormat" + idx);
        //}
        // wait for idList before proceeding
        Portal.Portlet.Sequence_DisplayBar.WaitingForIdList = true;
        this.send.SendSavedUidList();
        
        
        //document.location="/sviewer/viewer.cgi?tool=portal&save=file&log$=seqview&db="
        //+ this.getValue('Db')  + "&id=" + this.getValue('uid') + "&report=gene_fasta&retmode=text";
    },
    
    'SendToAnalysisToolSubmitted': function (cmd, idx, target) {
        //console.info("SendToAnalysisToolSubmitted: ", cmd, idx, target);        
        var elBtn = document.getElementById("analysistool_submit_btn");
        //console.info(elBtn);
        var sUrl =  elBtn.getAttribute("submit_url");
        
        var sSelectedUids = "";
        var count = 0;
        var a = document.getElementById("ResultView");
        if (a) {
            this.SelectedUids = a.getAttribute("acc");
            count = 1;
        } else {
            var elForm = document.getElementById("EntrezForm");
            sSelectedUids = elForm["EntrezSystem2.PEntrez.DbConnector.IdsFromResult"].value;
            count = getEntrezSelectedItemCount();
            
        }
        
        console.info("sSelectedUids=", sSelectedUids);
        
        function x_MakeRequest() {
            if (sSelectedUids) {
            	var n = sUrl.lastIndexOf("=");
            	if (n != -1) {
    	        	if (sUrl.indexOf("Structure/bwrpsb") != -1 ) sSelectedUids = sSelectedUids.replace(",", "%0A");
            		sUrl = sUrl.substr(0, n + 1) + sSelectedUids
            	}
            }       	
            console.info("sUrl=", sUrl);
            window.open(sUrl);
      }
        
        // get list of accessions - see ID-4366
        var oDp = new RemoteDataProvider("/entrez/eutils/esummary.fcgi?retmode=json&db=" + elForm["EntrezSystem2.PEntrez.DbConnector.Db"].value);
        oDp.onSuccess = function(obj) {
        	try {
        		var oObj = JSON.parse(obj.responseText);
//        		console.info(oObj);
        		oObj = oObj.result;
        		if (!oObj || !oObj.uids) throw "";
        		var a = [];
        		for (var i = 0, x; x = oObj.uids[i]; ++i) {
        			if (!oObj[x]) throw "";
        			a.push(oObj[x].caption);
        		}
        		sSelectedUids = a.join(",");
        		x_MakeRequest();
        	} catch (e) {
        		x_MakeRequest();
        	}
        };
        oDp.Post("id=" + encodeURIComponent(sSelectedUids));
    },
    'SendToClick': function (sendto, idx, e, target, name) {
        if (sendto.toLowerCase() == 'analysistool') {
            this.SendToAnalysisTool(sendto, idx);
        } else if (sendto.toLowerCase() == 'file') {
            this.SendToFile(sendto, idx);
        } else if (sendto.toLowerCase() == 'addtocollections') {
            this.SendToCollections(sendto, idx);
        } else if (sendto.toLowerCase() == 'addtoclipboard') {
            this.SendToClipboard(sendto, idx);
        }
    },
    'SendToAnalysisTool': function (name, idx) {
        var count = this.getItemCount();
        var content = 'Selected ' + count + ' items.';
        this.addSendToHintContent(name, idx, content);
    },
    'SendToFileSubmitted': function (cmd, idx, target) {
        this.base(cmd, idx, target);
        
        if (this.getValue("FileFormat").toLowerCase().match(/docsum/)) {
            // see also SequenceViewerSendToFileURL xslt
            this.send.Cmd({
                'cmd': cmd
            });
            Portal.requestSubmit();
        } else {
            // get option
            Portal.Portlet.Sequence_DisplayBar.dlreport = this.getValue("FileFormat");
            // wait for idList before proceeding
            Portal.Portlet.Sequence_DisplayBar.WaitingForIdList = true;
            this.send.SendSavedUidList();
        }
    },
    
    'SendToCodingSequences': function (cmd, idx, target) {
        // get option
        if (this.getInput("CSFormat" + idx)) {
            Portal.Portlet.Sequence_DisplayBar.dlreport = this.getValue("CSFormat" + idx);
        }
        // wait for idList before proceeding
        Portal.Portlet.Sequence_DisplayBar.WaitingForIdList = true;
        this.send.SendSavedUidList();
    },
    'SendToFile': function(name, idx){
	    // generate content
	    var count = (this.getValue('NonGiAccession') ? 1 : this.getItemCount());
		var content = 'Download ' + count + ' item' + (count == 1 ? "" : "s") + '.';
		this.addSendToHintContent(name, idx, content);
	},
    'SavedUidListMsg': function (oData) {
        var oP = Portal.Portlet.Sequence_DisplayBar;
        if (oP.WaitingForIdList) {
            oP.WaitingForIdList = false;
            
            // get idlist or querykey
            var urlfrag = '';
            var idList = oData.idlist || '';
            if (idList != '') {
                urlfrag = '&id=' + oData.idlist;
            } else if (this.getValue('NonGiAccession')) {
                urlfrag = '&id=' + this.getValue('NonGiAccession');
            } else if (this.getValue('ResultCount') * 1 == 1) {
                urlfrag = '&id=' + this.getValue('uid');
            } else {
                urlfrag = '&query_key=' + this.getValue('QueryKey') 
                + (this.getValue('CurrFilter') == "" ? "" : '&filter=' + this.getValue('CurrFilter'))
            	+ (this.getValue('FileSort') == "" ? "" : "&sort=" + this.getValue('FileSort'));
            }
            
            // go to viewer
            var to = document.getElementById("crto");
            if (to) {
            	to = parseInt(to.value, 10);
            	if (isNaN(to)) to = undefined;
            }
            var from = document.getElementById("crfrom");
            if (from) {
            	from = parseInt(from.value, 10);
            	if (isNaN(from)) from = undefined;
           }
            
//            var fmt_mask = oP.oData.fmt_mask;
//            if (oP.dlreport.indexOf("withparts") != -1) fmt_mask &= ~32768 // always show the sequence ID-3834
            
            var custom_view ; // see Sequence_ViewerCustomizer_JS where it was set
            if (oP.dlreport.indexOf("withparts") == -1) {
            	custom_view = (oP.oData.custom_view ? "&" + oP.oData.custom_view.join("&") : "");
            } else {
            	custom_view = "&withparts=on";
            }
            var dlurl = "/sviewer/viewer.cgi?tool=portal&save=file&log$=seqview" 
            	+ "&db=" + this.getValue('Db') 
            	+ '&report=' + oP.dlreport 
            	+ urlfrag 
            	+ (from ? "&from=" + from : "") 
            	+ (to ? "&to=" + to : "") 
            	+ (this.getInput('Sat') ? ('&sat=' + this.getValue('Sat') + '&satkey=' + this.getValue('SatKey')) : "") 
            	+ (this.getInput('Location') ? '&location=' + this.getValue('Location') : "")
            	+ (oP.oData.strand == "on" ? "&strand=on" : "") 
            	+ (oP.oData.extrafeat !== "" ? "&extrafeat=" + oP.oData.extrafeat : "") 
            	+ (custom_view ? custom_view : "")
            	+ (this.getInput('FShowgi').checked ? "&showgi=1" : "");
            
            // reset dlreport, dlsort
            oP.dlreport = '';
            
            console.info("SavedUidListMsg: ", dlurl);            
            window.location = dlurl;
        }
    },
    //save duidlist
    
    'SelectedRegionMsg': function (oData) {
        Portal.Portlet.Sequence_DisplayBar.regionUrlSeg =
        (oData.itemid > 0 ? "&itemID=" + oData.itemid: "") + (oData.from > 0 ? "&from=" + oData.from: "") + (oData.to > 0 ? "&to=" + oData.to: "");
    },
    
    'BitmaskMsg': function (oData) {
        Portal.Portlet.Sequence_DisplayBar.optionsUrlSeg =
        (oData.extrafeat !== "" ? "&extrafeat=" + oData.extrafeat : "")
        + (oData.custom_view ? oData.custom_view : "")
        + (oData.strand == "on" ? "&strand=on": "");
                
        // to be used for sending to graph & fasta_text only
        if (oData.strand == "on") {
            Portal.Portlet.Sequence_DisplayBar.optionsUrlSegForGraph = "&strand=true";
        }
        Portal.Portlet.Sequence_DisplayBar.oData = oData; // save for 'SavedUidListMsg'
    },
    
    // for report shortcuts in reports
    'SetPresentation': function (oData) {
        this.setValue("Presentation", oData.report);
    },
    'SavedAccnListHandler': function (oData) {
        console.log('SavedAccnListHandler from sequence display bar, oData=', oData);
        if (oData.src === 'sendto') {
            console.log('for ad sendto');
            var idList = oData.idlist || '';
            
            //radioSel = jQuery('input:radio[name=' + this.path + '.radio_analysis_tool]:checked')[0];
            radioSel = jQuery('input:radio[id^=analysistool]:checked')[0];
            
            var newUrl = jQuery(radioSel).attr('submit_url');
            //Portal.Portlet.Sequence_ToolsList.ToolsDefaultUrl;
            
            var param = 'QUERY=';
            if (newUrl.indexOf('QUERY=') > 0)
            param = 'QUERY='; else if (newUrl.indexOf('seqsToAlignFastA=') > 0)
            param = 'seqsToAlignFastA='; else if (newUrl.indexOf('bwrpsb/bwrpsb.cgi') > 0)
            param = 'queries=';
            if (idList != '') {
                var cutoff = newUrl.indexOf(param);
                newUrl = newUrl.substring(0, cutoff) + param + idList;
            }
            if (param == 'QUERY=') {
                //blast needs uids in separate lines
                newUrl = newUrl.replace(/,/g, '%0D');
            }
            if (param == 'queries=') //cdd requires new line separated
            newUrl = newUrl.replace(/,/g, '%0A');
            
            console.info("SavedAccnListHandler: ", newUrl);
            window.location = newUrl;
        }
    }
}, {
    dlreport: '',
    regionUrlSeg: '',
    optionsUrlSeg: '',
    //urlFmtMaskUrlSeg: '',
    optionsUrlSegForGraph: '',
    customized: false,
    WaitingForIdList: false,
    oData: {
    }
});
;
Portal.Portlet.Entrez_ResultsController = Portal.Portlet.extend({

	init: function(path, name, notifier) {
		console.info("Created Entrez_ResultsController");
		this.base(path, name, notifier);
	},	
		
	send: {
	    'Cmd': null
	},
		
	listen: {
	
	    /* page events */
	    
	    "RemoveFromClipboard<click>": function(e, target, name){
            this.RemoveFromClipboardClick(e, target, name);
	    },
	    
		/* messages */
		
		'Cmd': function(sMessage, oData, sSrc){
		    this.ReceivedCmd(sMessage, oData, sSrc);
		},
		
		'SelectedItemCountChanged' : function(sMessage, oData, sSrc){
		    this.ItemSelectionChangedMsg(sMessage, oData, sSrc);
		},
		
		// currently sent by searchbox pubmed in journals 
		'RunLastQuery' : function(sMessage, oData, sSrc){
			if (this.getInput("RunLastQuery")){
				this.setValue ("RunLastQuery", 'true');
			}
		}
		
	},//listen
	
	'RemoveFromClipboardClick': function(e, target, name){
	    if(confirm("Are you sure you want to delete these items from the Clipboard?")){
	        this.send.Cmd({'cmd': 'deletefromclipboard'});
		    Portal.requestSubmit();  
    	}
	},
	
	// fix to not show remove selected items message when Remove from clipboard was clicked directly on one item
	'ReceivedCmd': function(sMessage, oData, sSrc){
	    if (oData.cmd == 'deletefromclipboard'){
	        Portal.Portlet.Entrez_ResultsController.RemoveOneClip = true;
	    }
	},
	
	'ItemSelectionChangedMsg': function(sMessage, oData, sSrc){
	    // do not show any messages if one item from clipbaord was removed with direct click.
	    if (Portal.Portlet.Entrez_ResultsController.RemoveOneClip){
	        Portal.Portlet.Entrez_ResultsController.RemoveOneClip = false;
	    }
	    else{
    		this.SelectedItemsMsg(oData.count);
    	    this.ClipRemoveMsg(oData.count);
    	}
	},
	
	'SelectedItemsMsg': function(count){
	    SelMsgNode = document.getElementById('result_sel');
	    if (SelMsgNode){
	        if (count > 0){
	            SelMsgNode.className = 'result_sel';
 	            SelMsgNode.innerHTML = "Selected: " + count;
 	        }
 	        else {
 	            SelMsgNode.className = 'none';
 	            SelMsgNode.innerHTML = "";
 	        }
	    }
	},
	
	'ClipRemoveMsg': function(count){
	    ClipRemNode = document.getElementById('rem_clips');
 	    if (ClipRemNode){
 	        if (count > 0){
 	            ClipRemNode.innerHTML = "Remove selected items";
 	        }
 	        else {
 	            ClipRemNode.innerHTML = "Remove all items";
 	        }
 	    }
	},
	
	'ResultCount': function(){
	    var totalCount = parseInt(this.getValue("ResultCount"));
	    totalCount = totalCount > 0 ? totalCount : 0;
	    return totalCount;
	}

},
{
    RemoveOneClip: false
});

function getEntrezResultCount() {
    var totalCount = document.getElementById("resultcount") ? parseInt(document.getElementById("resultcount").value) : 0;
	totalCount = totalCount > 0 ? totalCount : 0;
	return totalCount;
}

;
Portal.Portlet.Sequence_ResultsController = Portal.Portlet.Entrez_ResultsController.extend({
	
	init: function(path, name, notifier) {
		this.base(path, name, notifier);
	},
	
	send: {
	    'Cmd': null,
		'SavedAccnList': null
	},
	
	listen: {
	    /* page events */
	    
	    "RemoveFromClipboard<click>": function(e, target, name){
            this.RemoveFromClipboardClick(e, target, name);
	    },
	    
		/* messages */
		
		'Cmd': function(sMessage, oData, sSrc){
		    this.ReceivedCmd(sMessage, oData, sSrc);
		},
		
		'SelectedItemCountChanged' : function(sMessage, oData, sSrc){
		    this.ItemSelectionChangedMsg(sMessage, oData, sSrc);
		},
		
		// currently sent by searchbox pubmed in journals 
		'RunLastQuery' : function(sMessage, oData, sSrc){
			if (this.getInput("RunLastQuery")){
				this.setValue ("RunLastQuery", 'true');
			}
		},
		
	    // Handles item select/deselect events w/ accessions
		// Argument is { 'id': item-id, 'selected': true or false, 'accession': item-accn		
		'AccessionSelectionChanged' : function(sMessage, oData, oSrc) {
			var sSelection = this.getValue("AccnsFromResult");
			var bAlreadySelected = (new RegExp("\\b" + oData.accession + "\\b").exec(sSelection) != null);
	       	var count =0;
	       	
			if (oData.selected && !bAlreadySelected) {
				sSelection += ((sSelection > "") ? "," : "") + oData.accession;
			   	this.setValue("AccnsFromResult", sSelection);
			   	if (sSelection.length > 0){
			   		count = sSelection.split(',').length;
			   	}
			   	//this.send.SelectedItemCountChanged({'count': count});
			   	//this.send.newUidSelectionList({'list': sSelection});
		   	} else if (!oData.selected && bAlreadySelected) {
				sSelection = sSelection.replace(new RegExp("^"+oData.accession+"\\b,?|,?\\b"+oData.accession+"\\b"), '');
		   	   	this.setValue("AccnsFromResult", sSelection);
				console.info("Message AccessionSelectionChanged - AccnsFromResult after change:  " + this.getValue("AccnsFromResult"));
			   	if (sSelection.length > 0){
			   		count = sSelection.split(',').length;
			   	}
				console.info("Message AccessionSelectionChanged - AccnsFromResult length:  " + count);   
				//this.send.SelectedItemCountChanged({'count': count});
			   	//this.send.newUidSelectionList({'list': sSelection});
		   	}
		 },
		 
		 'SendSavedAccnList': function (sMessage, oData, sSrc){
		    console.log('SendSavedAccnList ' + oData.src);
		    this.send.SavedAccnList({'idlist': this.getValue("AccnsFromResult"),'src':oData.src});
		}
    }
});

function getEntrezResultCount() {
    return $PN('Sequence_ResultsController').ResultCount();
}

//ID-5392
(function() {
	var s = document.getElementById("database");
	if (!s) return;
	s = s.value;
	if (s !== "protein" && s !== "ipg") return;
	(function(t,e,s,o){var n,a,c;t.SMCX=t.SMCX||[],e.getElementById(o)||(n=e.getElementsByTagName(s),a=n[n.length-1],c=e.createElement(s),c.type="text/javascript",c.async=!0,c.id=o,c.src=["https:"===location.protocol?"https://":"http://","widget.surveymonkey.com/collect/website/js/tRaiETqnLgj758hTBazgdzZ1LDI6FW_2FDUW4hspOoH4LI6V5l_2BV4JxPN8G3P5_2B_2FXV.js"].join(""),a.parentNode.insertBefore(c,a))})(window,document,"script","smcx-sdk");
}) ();
;
Portal.Portlet.Entrez_Messages = Portal.Portlet.extend({

	init: function(path, name, notifier) {
		this.base(path, name, notifier);
		
		this.setMsgAreaClassName();
	},
	
	listen: {
	   /* messages from message bus*/
		
		'AddUserMessage' : function(sMessage, oData, sSrc) {
		    // create new message node
		    var msgnode = document.createElement('li');
		    if (oData.type != ''){
		        msgnode.className = oData.type + ' icon'; 
		    }
		    if (oData.name != ''){
		        msgnode.id = oData.name; 
		    }
		    msgnode.innerHTML = "<span class='icon'>" + oData.msg + "</span>";
		    
		    // add new node as first message in message block (not ads that look like messages)
		    var parent = document.getElementById('msgportlet');
		    if (parent){
    		    var oldnode = document.getElementById(oData.name);
    		    if (oldnode){
    		        parent.removeChild(oldnode);
    		    }
    		    var firstchild = parent.firstChild;
    	        if (firstchild){
                    parent.insertBefore(msgnode, firstchild);
                }
                else{
                    parent.appendChild(msgnode);
                }
                this.setMsgAreaClassName('true');
            }
            //if there was no ul, create one, then insert the li
            else {
                var msgarea = document.getElementById('messagearea');
                if (msgarea){
                    var msgportlet = document.createElement('ul');
                    msgportlet.className = 'messages';
                    msgportlet.id = 'msgportlet';
                    msgportlet.appendChild(msgnode);
                    if (msgarea.firstChild){
                         msgarea.insertBefore(msgportlet, msgarea.firstChild);
                    }
                    else{
                        msgarea.appendChild(msgportlet);
                    }
                    this.setMsgAreaClassName('true');
                }
            }
		},
		
		'RemoveUserMessage' : function(sMessage, oData, sSrc) {
		    var msgnode = document.getElementById(oData.name);
		    if (msgnode){
		        var parent = document.getElementById('msgportlet'); 
		        if (parent){
    		        parent.removeChild(msgnode);
    		        this.setMsgAreaClassName();
    		        // if the parent ul has no children then remove the parent
    		        if (parent.firstChild){}
    		        else {
    		            if (document.getElementById('messagearea')) {
    		                document.getElementById('messagearea').removeChild(parent);
    		            }
    		        }
    		    }
		    }
		}
	}, // end listen
	
	'setMsgAreaClassName' : function(hasMsg){
        var msgarea = document.getElementById('messagearea');
	    if (msgarea){
	        var msgclass = "empty";
	        
    	    // if a message was added, hasMsg is set to true at call time to avoid checks. 
    	    // by default, hasMsg is false.
    	    if (hasMsg == 'true'){
    	        msgclass = "messagearea";
    	    }
    	    else if (msgarea.getElementsByTagName('li').length > 0){
                msgclass = "messagearea"; 
        	}
        	
            msgarea.className = msgclass;
        }
	} // end setMsgAreaClassName
});
		
		
;
Portal.Portlet.Entrez_RVBasicReport = Portal.Portlet.extend({
	
	init: function(path, name, notifier) {
		console.info("Created report portlet");
		this.base(path, name, notifier);
	},
	
	send: {
		'ItemSelectionChanged': null,
		'ClearIdList': null,
		'Cmd': null
	},
	
	listen: {
		"uid<click>" : function(e, target, name){
		    this.UidClick(e, target, name);
		},
		
		"RemoveClip<click>" : function(e, target, name){
		    this.ClipRemoveClick(e, target, name);              
		}
	},
	
	'UidClick': function(e, target, name){	
		this.send.ItemSelectionChanged( { 'id': target.value,
		                                  'selected': target.checked });
	},
	
	'ClipRemoveClick': function(e, target, name){
	    this.send.ClearIdList();
		this.send.Cmd({'cmd': 'deletefromclipboard'});
		this.send.ItemSelectionChanged( { 'id': target.getAttribute('uid'),
		                                  'selected': true });
		Portal.requestSubmit();
	}
});
   

;
Portal.Portlet.Sequence_ViewerTitle = Portal.Portlet.Entrez_RVBasicReport.extend({

	init: function(path, name, notifier) {
		console.info("Created Sequence_ViewerTitle");
		this.base(path, name, notifier);
	},
	
	send: {
	    'ItemSelectionChanged': null,
		'ClearIdList': null,
		'Cmd': null,
	    'RemoveUserMessage': null,
	    'AddUserMessage': null,
	    'AccessionSelectionChanged': null,
		'SetPresentation': null
	},
	
	listen: {
	    "uid<click>" : function(e, target, name){
		    this.UidClick(e, target, name);
		},
		
		"RemoveClip<click>" : function(e, target, name){
		    this.ClipRemoveClick(e, target, name);              
		},
		
		"ReportShortCut<click>" : function(e, target, name){
		    this.ReportShortCutClicked(e, target, name);              
		},
		
	   /* messages from message bus*/
		
		'SelectedRegion' : function(sMessage, oData, sSrc) {
            this.ProcessSelectedRegion(sMessage, oData, sSrc);      
	    },
	    
	    'AdvisoryMessage' : function(sMessage, oData, sSrc) {
	        if (oData.type == 'HiddenSequence'){
                if (oData.action == 'remove'){
                     this.send.RemoveUserMessage({
                         name: 'HiddenSequence'
                     }); 
                }
                else if (oData.action == 'add'){
                    this.send.AddUserMessage({
                        type: 'info',
                        msg: oData.text,
                        name: 'HiddenSequence'
                   });
                }
	        } // oData.type
	    },
	    
	    'Bitmask' : function(sMessage, oData, sSrc) {
            this.ProcessBitmask(sMessage, oData, sSrc);  
        },
        
        'Customized': function(sMessage, oData, sSrc) {
            Portal.Portlet.Sequence_ViewerTitle.customized = true;
        }
	    
	}, //send
		
	'UidClick': function(e, target, name){	
		this.send.AccessionSelectionChanged ({
		    'id': target.value,
		    'selected': target.checked,
		    'accession': target.getAttribute('accn') || ""
		});
		this.base(e, target, name);
	},
	
	'ProcessSelectedRegion': function(sMessage, oData, sSrc){	
	    var from = oData.from;  
        var to = oData.to; 
        var itemid = oData.itemid;
        
        var unit = (this.getInput("Database") && this.getValue("Database").toLowerCase() == "protein")? "aa" : "base" ;
        var text = '';
        if (itemid != ''){
            text = 'Showing selected region.';
        }
        else if(from != '' && to != ''){
            var range = Math.abs(to - from); 
            
            if (range == 0){
                text = 'Showing ' + unit + ' ' + from + '.';
            }
            else {
                text = 'Showing ' + this.CustomizeUnit(range + 1, unit) + ' region from ' + unit + ' ' +
                   from + ' to ' + to + '.';
            }
        }
        else if(from != ''){
            var range = Math.abs(oData.length - from); 
            text = 'Showing ' + this.CustomizeUnit(range + 1, unit) + ' region from ' + unit + ' ' + from + '.';
        }
        else if(to != ''){ 
            text = 'Showing ' + this.CustomizeUnit(to, unit) + ' region up to ' + unit + ' ' + to + '.';
        }
        
        // update text on screen, it may be empty
        if (text == ''){
             this.send.RemoveUserMessage({
                 name: 'SelectedRegion'
             }); 
        }
        else{
            this.send.AddUserMessage({
                type: 'info',
                msg: text,
                name: 'SelectedRegion'
           });
        }
        
        // for report shortcut links
        Portal.Portlet.Sequence_ViewerTitle.regionUrlSeg = 
            (oData.itemid > 0 ? "&itemID=" + oData.itemid : "")
            + (oData.from > 0 ? "&from=" + oData.from : "")
            + (oData.to > 0 ? "&to=" + oData.to : "");
	},
	
	'CustomizeUnit' : function(range, unit){
	    if (unit == "aa"){
	         return (range + " aa");
	    }
	    else if (range < 1000){
	        return (range + " bp");
	    }else if (range < 1000000) {
	        return ((range/1000).toFixed(2) + "kb");
	    }else{
	        return ((range/1000000).toFixed(2) + "Mb");
	    }
	},
	
	'ProcessBitmask': function(sMessage, oData, sSrc){        
        if (oData.strand == "on" ){
            Portal.Portlet.Sequence_ViewerTitle.strandUrlSeg = "&strand=true";
        }
    },
    
    //ProcessReportShortCutClicked: function(sMessage, oData, sSrc){
    'ReportShortCutClicked': function(e, target, name){
        
        var count = this.getValue('ResultCount');
        var url = target.getAttribute('href') || "#";
        
        if (url.match(/^\/popset\?/)) {
            window.location = url;
            return;
        }
        
        // remove &from, &to which came from ID-1475
        url = url.replace(/&?from=\d+/g, "").replace(/&?to=\d+/g, "");
       
        var report= url.match(/report=(\w*).*$/);
        if (report.length > 0) report = report[1];
        
        var bIsNoEstReport = !report.match(/est/);
     
        // if current report is graph, and not going to est format, send all options in URL
        if (this.getValue('Report') == 'graph' && bIsNoEstReport){
            var urlfrag = SeqView.PortalSeqGraphicsInfo().match(/from=(\d*)&to=(\d*)&itemid=(\d*)&strand=(true|false)/) || "";
            var from = urlfrag[1] && urlfrag[1] != 1 ? "&from=" + urlfrag[1] : "";
            var to = urlfrag[2] ? "&to=" + urlfrag[2] : "";
            var itemid = urlfrag[3] ? "&itemid=" + urlfrag[3] : "";
            var strand = (urlfrag[4] == 'true') ? "&strand=true" : "";
            window.location = url + from + to + itemid + strand;
        }
        // If it is the graphical report or multiple record view (not est) and user has customized the current report
        else if (Portal.Portlet.Sequence_ViewerTitle.customized 
            && (report.match(/graph/) || (count > 1 && bIsNoEstReport))){
            window.location = url 
                + Portal.Portlet.Sequence_ViewerTitle.regionUrlSeg 
                + Portal.Portlet.Sequence_ViewerTitle.strandUrlSeg;
        }
        // if Customize portlet was used and the new report will have a customize portlet and only one record is displayed, then 
        // submit the form to get all parameters from POST
        else if (Portal.Portlet.Sequence_ViewerTitle.customized && count == 1 && bIsNoEstReport){ 
            this.send.Cmd({'cmd': 'displaychanged'});
            this.send.SetPresentation({'report': report});            
            Portal.requestSubmit();
        }
        else if (Portal.Portlet.Sequence_ViewerTitle.customized && bIsNoEstReport){
            ;;
        }
        // otherwise if not customized, send default values and go to the URL
        else {
             if (this.getInput('Sat')){
                url += '&sat=' + this.getValue('Sat');
            }
             if (this.getInput('SatKey')){
                 url += '&satkey=' + this.getValue('SatKey');
             }
             
             if (this.getInput('Location')){
                 url += '&location=' + this.getValue('Location');
             }
             
            // est report cannot show region options 
            if (!report.match(/est/)) {
                url += Portal.Portlet.Sequence_DisplayBar.regionUrlSeg ;       
            }
            window.location = url;
        }
    }
	
},
{
    regionUrlSeg: '',
    strandUrlSeg: '',
    customized: false
});
;
Portal.Portlet.Sequence_ViewerReport = Portal.Portlet.extend({

	init: function(path, name, notifier) {
		console.info("Created Sequence_ViewerReport");
		this.base(path, name, notifier);

		var notifier = Notifier.getInstance();
	    notifier.setListener(null, "CONTENT_LOADER_FINISHED", this.DownloaderFinished );   
	    notifier.setListener(null, "CONTENT_LOADER_CANCELED", this.DownloaderCancelled ); 
	    notifier.setListener(this, "SEARCH_EXECUTED", function(oListener, custom_data, sMessage, oNotifier) {
			// load sequence with markup, if not loaded
			if (!Portal.Portlet.Sequence_ViewerReport.LoadSequenceWithMarkup){
			    Portal.Portlet.Sequence_ViewerReport.LoadSequenceWithMarkup = true;
                Dispatcher.getInstance().notify(null, 'LoadSequenceWithMarkup');
			}
		});
	    
		var report = this.getValue('report');
		
		// no region data will be sent. Set to true so that 'Bitmask' does not wait for this message
		if (report == 'asn1'){
		    Portal.Portlet.Sequence_ViewerReport.regionAvailable = true;
		} 
		// for these reports, no messages will be sent
		else if (report != 'genbank' && report != 'genpept' && report != 'fasta' && report != 'gbwithparts' 
		&& report != 'gpwithparts' && report != 'ipg'){
		    this.CreateReport();
		}
		// no region data available for multiple record view, so don't wait for message
		else if (this.getInput('display_type') && this.getValue('display_type') == 'multi'){
		   Portal.Portlet.Sequence_ViewerReport.regionAvailable = true;
		}
	},
    
	listen: {
	        // events
	    /*    
	    "ShowSequenceLink<click>": function(e, target, name){
	        this.setValue('report', target.getAttribute('report'));
	        Portal.Portlet.Sequence_ViewerReport.displayLongRecord = true;
	        this.ReportPage();
	    },*/
	
        // messages
        'Sequence_ViewerReportFetchContent': function(sMessage, oData, sSrc) {
            this.FetchContent();
        },
        
        'Sequence_ViewerReportWaitOver': function(sMessage, oData, sSrc) {
            this.StartContentFetch();
        },
        
        'LoadSequenceWithMarkup': function(sMessage, oData, sSrc) {
            this.CreateReport();
        },
        
        'Sequence_ViewerReportRemainingNavMenu': function(sMessage, oData, sSrc) {
            this.RemainingNavBarMenu(oData.counter, 1);
        },
        
	    'SelectedRegion' : function(sMessage, oData, sSrc) {
	        console.info("Region oData=" , oData)
	    //    console.info('message received. f:'+oData.from+' to:'+ oData.to + ' itemid:' + oData.itemid); //for debug
            Portal.Portlet.Sequence_ViewerReport.from = oData.from;  
            Portal.Portlet.Sequence_ViewerReport.to = oData.to; 
            Portal.Portlet.Sequence_ViewerReport.itemid = oData.itemid;
            if (oData.master){
                 Portal.Portlet.Sequence_ViewerReport.master = oData.master;
            }
             
	        Portal.Portlet.Sequence_ViewerReport.regionAvailable = true;	        
	        if (Portal.Portlet.Sequence_ViewerReport.bitmasksAvailable){
	            this.CreateReport(); 
	        }
	    },
	    
	    'Bitmask' : function(sMessage, oData, sSrc) { 
	        console.info("Customize oData=" , oData)
	        console.info('message received. extrafeat:', oData.extrafeat 
	        	//, ',fmt_mask:' , oData.fmt_mask 
	        		, "custom_view=", oData.custom_view
	            , ',strand:' , oData.strand); //for debug
	        Portal.Portlet.Sequence_ViewerReport.extrafeat = oData.extrafeat;
	        //Portal.Portlet.Sequence_ViewerReport.fmt_mask = oData.fmt_mask;
	        Portal.Portlet.Sequence_ViewerReport.custom_view = "&" + oData.custom_view.join("&");
	        
	        Portal.Portlet.Sequence_ViewerReport.strand = oData.strand;
	        Portal.Portlet.Sequence_ViewerReport.comp = oData.comp;
	        Portal.Portlet.Sequence_ViewerReport.show_sequence = oData.show_sequence;	        
	        if (oData.master){
                 Portal.Portlet.Sequence_ViewerReport.master = oData.master;
            }


	        Portal.Portlet.Sequence_ViewerReport.bitmasksAvailable = true;	        
	        if (Portal.Portlet.Sequence_ViewerReport.regionAvailable){
	            this.CreateReport(); 
	        }
	    }

	},
	
	CreateReport: function(){
	    var rPortlet = Portal.Portlet.Sequence_ViewerReport;
	    rPortlet.InDownloadCycle = false;
	
	    /* cancel all previous */
	    // if an instance of downloader was started and not finished or cancelled, cancel it before 
        // making another xml-http call to viewer or downloader
        if (rPortlet.downloader == 'on'){
            var notifier = Notifier.getInstance();
            notifier.Notify(null, "LOADER_CANCELED", {} );
        }
        ContentLoader.removeCancelMessages();
        /*
        if (rPortlet.viewer == 'on'){
            rPortlet.oRemoteDataProvider.Abort(); 
            console.info('oRemoteDataProvider.Abort');
        }
        */
        
        // while anything is executing, wait
        if(rPortlet.downloader == 'on' || rPortlet.viewer == 'on'){
            Portal.Portlet.Sequence_ViewerReport.waiting = true;
        }
        else {
            this.StartContentFetch();
        }        
    },
    
    StartContentFetch: function(){
    
        // clear the current contents
        jQuery( 'div.gbff' ).each( function() {
            this.innerHTML = "";
        });
        // remove any leftover navigation on those records which no not have contents (no .gbff)
        jQuery( 'div.hnav' ).each( function() {
            jQuery(this).remove();
        });
        
        var rPortlet = Portal.Portlet.Sequence_ViewerReport;
        rPortlet.counter = 0;
        if (!rPortlet.InDownloadCycle){
            rPortlet.InDownloadCycle = true;
            this.FetchContent();
        }     
    },
	
	FetchContent: function(){
	    var counter = ++Portal.Portlet.Sequence_ViewerReport.counter;
	    // two things to check. Execute only for the number of items on the page & stop processing 
	    // if a new round of processing has started because some setting was updated on the page
	    if (counter <= this.getValue("ItemCount") 
	        && Portal.Portlet.Sequence_ViewerReport.InDownloadCycle){
	        var FlatFileNode = document.getElementById("viewercontent" + counter);
	        if (FlatFileNode && jQuery(FlatFileNode).hasClass('gbff')){
	            
	            // decide what type of page to show
                var PageType = this.DecideToShowReport(FlatFileNode);
                
                if (PageType == 'report'){
                    this.ViewerPage(FlatFileNode);
                }
                else if (PageType == 'downloader'){
                    this.DownloaderPage(FlatFileNode);
                }
                
                // change the navigation bar 
                this.NavBar(FlatFileNode, counter, true, 1);
            
                // redraw the title in IE6
	            //this.reDrawTitle(counter, FlatFileNode.getAttribute('val'));
	            
	        }//if flatfilenode
	        else if (FlatFileNode){
	            // add the navigation bar if there are records before and after  
                this.NavBar(FlatFileNode, counter, false, 1);
	            this.FetchContent();
	        }
        }
        Notifier.getInstance().Notify(null, "SEQUENCE_PART_LOADED", parseInt(this.getValue("ItemCount")) - counter + 1);
	},
    
    ViewerPage: function(FlatFileNode){
        var oThis = this;   
    	
        var oPh = FlatFileNode;
        oPh.style.display = "block";
    	
    	var x = Portal.Portlet.Sequence_ViewerReport;
    	
	    // Overload remote data provider callbacks
	    x.oRemoteDataProvider.onSuccess = function(oObj) {
    	    if (oObj.responseText.indexOf("OUTPUT_TOO_BIG") != -1) {
    	        oPh.innerHTML = "";
    	        x.viewer = 'off';
    	        if (x.InDownloadCycle){
        	        oThis.DownloaderPage(FlatFileNode);
        	    }
        	    else if (Portal.Portlet.Sequence_ViewerReport.waiting){
        	        Portal.Portlet.Sequence_ViewerReport.waiting = false;
        	        oThis.StartContentFetch();
        	    }
    	    } else {
    	        // render the page
	            var report = oThis.getValue('report');
	            var elem = ( report == "genbank" || report == "genpept" || report ==  "gbwithparts" || 
	                        report ==  "gpwithparts" || report ==  "ipg") ? "div" : "pre";
     	        setTimeout(function() { oPh.innerHTML = "<" + elem + ">" 
     	                                                + oObj.responseText + "</" + elem +">" ; }, 100); 
     	        x.viewer = 'off';
     	        
     	        // call next iteration     	        
     	        if (x.InDownloadCycle){
     	            oThis.FetchContent();
     	        }
     	        else if (Portal.Portlet.Sequence_ViewerReport.waiting){
        	        Portal.Portlet.Sequence_ViewerReport.waiting = false;
        	        oThis.StartContentFetch();
        	    }
    	    }
    	    setTimeout(function() {Notifier.getInstance().Notify(null, "SEQUENCE_LOADED");}, 500);
	    }
	    
	    // on error, make a second attempt at download by using the downloader
	    x.oRemoteDataProvider.onError = function(oObj) {
	        oPh.innerHTML = "";
	        x.viewer = 'off';
	        if (x.InDownloadCycle){
                oThis.DownloaderPage(FlatFileNode);
            }
            else if (Portal.Portlet.Sequence_ViewerReport.waiting){
    	        Portal.Portlet.Sequence_ViewerReport.waiting = false;
    	        oThis.StartContentFetch();
    	    }
	    }
	    
	    x.oRemoteDataProvider.onStart = function(oObj) {
	        // show text when started loading the page
	        oPh.innerHTML = "<div class='loading'>Loading ... " +
	            "<img src='/core/extjs/ext-2.1/resources/images/default/grid/loading.gif'" 
	            + " alt='record loading animation'/></div>";
	    }

        // create url to viewer.fcgi and call asynchronous HTTP request to viewer.fcgi

	    var sRequest = oThis.CreateUrl(oPh)
	      + "&maxdownloadsize=" + oThis.getValue('maxdownloadsize');
	    
	    if (x.InDownloadCycle && x.viewer == 'off'){
	        x.viewer = 'on';
	        x.oRemoteDataProvider.Get(sRequest);
	    }	        
    },
    
    DownloaderPage: function(FlatFileNode){
        // call pload.cgi
        // see https://www.ncbi.nlm.nih.gov/core/ajax_loader/2.1/js/contentLoader.js
        //create an instance of the loading bar
        var sb = new LoadingBar();                
        //initialize the loading bar
        sb.init();
        
        //build the path to the file that we want to request .cgi, NOT .fcgi!
        // always use 'http' - see https://jira.ncbi.nlm.nih.gov/browse/ID-2940
        var lFile = "http://" + document.location.hostname + "/sviewer/viewer.cgi?" + this.CreateUrl(FlatFileNode);
        
        //alert("lFile=" + lFile);

        var report = this.getValue('report');
        var elem = ( report == "genbank" || report == "genpept" || report == "gbwithparts" 
                  || report ==  "gpwithparts" || report ==  "ipg") ? "div" : "pre";
        //create a new instance of the ContentLoader specifing the id of the output location and the file url
        var cl = new ContentLoader(FlatFileNode.getAttribute('id'), lFile);
        
        //Start the rendering of the file  
        if (Portal.Portlet.Sequence_ViewerReport.InDownloadCycle && Portal.Portlet.Sequence_ViewerReport.downloader == 'off'){
            Portal.Portlet.Sequence_ViewerReport.downloader = 'on'; 
            cl.startFetch(); 
        }
    }, 
    
    // create main part of URL to viewer (don't include report param)
    CreateUrl: function(FlatFileNode){
        // create URL to fetch report
        var x = Portal.Portlet.Sequence_ViewerReport;
        var report = this.getValue('report');
        //if (x.master == 'false' && report.toLowerCase() == 'genbank'){ report = 'gbwithparts';} // commented because of ID-1729
        
        if (x.from > 0 || x.to > 0) {
        	//x.custom_view = x.custom_view.replace("&conwithfeat=on", "");
        	x.custom_view = x.custom_view.replace("&withparts=on", "");
        }
        var URL =  "id=" + FlatFileNode.getAttribute('val')
          + "&db=" + this.getValue('db')
   	      + "&report=" + (report === "fasta_text" ? "fasta" : report)   
          + (x.extrafeat !== "" ? "&extrafeat=" + x.extrafeat : "")
          + (x.custom_view ? x.custom_view : "")
          + (x.itemid > 0 ? "&itemID=" + x.itemid : "")
          + (x.from > 0 ? "&from=" + x.from : "")
          + (x.to > 0 ? "&to=" + x.to : "")
          + (x.strand == "on" ? "&strand=" + x.strand : "")
          + (x.comp == 1 ? "&comp=1" : "")
   	      + (report === "fasta_text" ? "&retmode=text" : "&retmode=html")
   	      + "&withmarkup=on&tool=portal&log$=seqview";
	    
        if (this.getValue('ExpandGaps') === "on") {
        	URL += '&expand-gaps=on';
        }
        if (this.getValue('InUse') != '') {
        	URL += '&inuse=' + this.getValue('InUse');
        }
        if (this.getInput('protein_id')){
	        URL += '&protein_id=' + this.getValue('protein_id');
	    }
	    if (this.getInput('Sat')){
	        URL += '&sat=' + this.getValue('Sat');
	    }
	    if (this.getInput('SatKey')){
	        URL += '&satkey=' + this.getValue('SatKey');
	    }
	    if (this.getInput('Location')){
	        URL += '&location=' + this.getValue('Location');
	    }
	    
	    
	    //if (document.getElementById("SCDsnp") && document.getElementById("SCDsnp").checked) { // ID-5345, ID-5346
	    //    URL += '&show-vdb-snp=1'; 
	    //}

	    if ((report == "fasta_text") && this.getInput('fasta_text_params')){
	        URL += this.getValue('fasta_text_params');
	    }
	    if (x.LoadSequenceWithMarkup && (
	        report == 'gbwithparts' || report == 'gpwithparts' ||
	        report == 'genbank' || report == 'genpept' ||
	        report == 'fasta'
	        )) {
            URL += '&search=1';
        }
	    
        console.info("URL for pload:", URL);  
        return URL;      
    },
	
	DecideToShowReport: function(FlatFileNode){ 
	    var ShowReport = 'report'; //'report' | 'downloader';
	    var x = Portal.Portlet.Sequence_ViewerReport;
	    var Limit = 1 * this.getValue('maxdownloadsize');
	    var currentSize = 1 * FlatFileNode.getAttribute('sequencesize');
	    var virtualseq = FlatFileNode.getAttribute('virtualsequence');
	    
	    if (x.itemid || virtualseq == 'true'){
	        // do nothing, ShowReport is already set to 'report'
	    }
	    else if (x.from > 0 || x.to > 0){
	        //if either to or from or both have values, get the range size
	        if (x.from > 0 && x.to > 0){
	        	if (x.from > x.to ) {
		            currentSize = currentSize + x.to - x.from + 1;	        		
	        	}
	        	else {
		            currentSize = x.to - x.from;	        		
	        	}
	        }
	        else if (x.from > 0){
	            currentSize -= x.from;
	        } 
	        else if (x.to > 0){
	            currentSize = x.to; 
	        }
	        
	        if (currentSize >= Limit){
	            ShowReport = 'downloader';
	        } 
	    }
	    else if (currentSize >= Limit){
            ShowReport = 'downloader';
        } 
	    
	    console.info(currentSize, Limit);
	    return ShowReport;
	},
	
	DownloaderFinished: function(oThis){
	    var counter = Portal.Portlet.Sequence_ViewerReport.counter;
        Portal.Portlet.Sequence_ViewerReport.downloader = 'off'; 
        
        // call next iteration     	        
        if (Portal.Portlet.Sequence_ViewerReport.InDownloadCycle){
             Dispatcher.getInstance().notify(null, 'Sequence_ViewerReportFetchContent');
        }
        else if (Portal.Portlet.Sequence_ViewerReport.waiting){
	        Portal.Portlet.Sequence_ViewerReport.waiting = false;
            Dispatcher.getInstance().notify(null, 'Sequence_ViewerReportWaitOver');
	    }
	    
	    // if it was segmented set, look for more menus to transform 
        Dispatcher.getInstance().notify(null, 'Sequence_ViewerReportRemainingNavMenu', {'counter': counter});
	},
	
	DownloaderCancelled: function(){
	    var counter = Portal.Portlet.Sequence_ViewerReport.counter;
	    Portal.Portlet.Sequence_ViewerReport.downloader = 'off';
	    
	    if (Portal.Portlet.Sequence_ViewerReport.waiting){
	        Portal.Portlet.Sequence_ViewerReport.waiting = false;
            Dispatcher.getInstance().notify(null, 'Sequence_ViewerReportWaitOver');
	    }
	    
	    // if it was segmented set, look for more menus to transform 
        Dispatcher.getInstance().notify(null, 'Sequence_ViewerReportRemainingNavMenu', {'counter': counter});
	},
	
	SequenceSearchExecuted: function(){
	    // load sequence with markup, if not loaded
		if (!Portal.Portlet.Sequence_ViewerReport.LoadSequenceWithMarkup){
		    Portal.Portlet.Sequence_ViewerReport.LoadSequenceWithMarkup = true;
	        this.CreateReport();
		}
	},
	
	'NavBar': function(SeqNode, index, expectContent, iteration){
	    var othis = this;
	
	    // we don't want to add navigation for fasta_text format
        var report = this.getValue("report");       
        if (report != 'fasta_text' && report != 'ipg'){
            
            var seqid = jQuery(SeqNode).attr("val"); 
            
    	    // if this record has content
            if (jQuery(SeqNode).find('.localnav').html()){
                console.info('found localnav in iteration ' + iteration);
                jQuery(SeqNode).find('.localnav').each( function(lNavIndex){
                    var localNav = jQuery(this);
                    var prevnext = '';
                    var newNav = '';
                    
                    newNav = '<div class="hnav" id="hnav' + seqid + '_' + lNavIndex + '">' 
                        + '<div class="goto">' 
                        +    '<a href="#goto' + seqid + '_' + lNavIndex + '" class="tgt_dark jig-ncbipopper" config="' 
                               + "openMethod : 'click', closeMethod : 'click', destPosition: 'top left', adjustFit: 'none', triggerPosition: 'bottom left'"
                               + '"' + 'id="gotopopper' + seqid +  '_' + lNavIndex + '">Go to:</a>'
                        + '</div>' ;
                        
                    // add next previous
                    if (lNavIndex == 0){
                        prevnext = othis.NavBarPrevNext(index);
                    }
                    newNav += prevnext + '</div>';
                    var popper = '<div class="tabPopper nonstd_popper" style="display: none;" id="goto' + seqid +  '_' + lNavIndex + '"><ul class="locals">'
                     + othis.NavBarMenuContent(localNav)
                     + '</ul></div>'; 
                   
                    // replace content
                    localNav.replaceWith(newNav);
                    jQuery('#hnav' + seqid + '_' + lNavIndex).after(popper);
                    jQuery.ui.jig.scan(jQuery('#hnav' + seqid + '_' + lNavIndex));
                });                   
            }
            // if no existing navigation is present, but record is loaded, we add navigation
            else if (jQuery(SeqNode).find('pre').html()){
                console.info('found pre in iteration ' + iteration);
                var prevnext = '';
                var newNav = '';
                prevnext = this.NavBarPrevNext(index);
                if (prevnext != ''){
                    newNav = '<div class="hnav"><div class="goto"/>' + prevnext + '</div>';
                    // create nav before other content
                    jQuery(SeqNode).prepend(newNav); 
                }      	    
        	}
    	    // if we expect content in the record, but it is not available yet, we wait for the record to load
    	    else if (iteration <= 20 && expectContent){
    	        var oThis = this;
    	        setTimeout(function() { oThis.NavBar(SeqNode, index, expectContent, iteration + 1); }, 100);
    	    }
    	    // if we don't expect the record to have any content - just add prev/next. This is also the fall-back case
    	    else {
    	        console.info('default case prevnext only in iteration ' + iteration);
    	        var prevnext = '';
    	        var newNav = '';
    	        prevnext = this.NavBarPrevNext(index);
                if (prevnext != ''){
                    newNav = '<div class="hnav"><div class="goto"/>' + prevnext + '</div>';
                    // create nav before other content
                    jQuery(SeqNode).prepend(newNav); 
                }   	
    	    }
        } // report != fasta_text        
	},
	
	'NavBarPrevNext': function(index){
	    var prevNode = document.getElementById('viewercontent' + (index - 1));
	    var nextNode = document.getElementById('viewercontent' + (index + 1));
	    
	    if (prevNode || nextNode){
	        var prevnext = '<ul class="links inline_list_right">';
	        
	        if (prevNode){
	            var previd = jQuery(prevNode).attr("val");
	            var link = previd ? 'title' + previd : 'title_' + (index - 1);
	            prevnext += '<li><a href="#' + link + '">Previous record</a></li>';
	        }
	        if (nextNode){
	            var nextid = jQuery(nextNode).attr("val");
	            var link = nextid ? 'title' + nextid : 'title_' + (index + 1);
	            prevnext += '<li><a href="#' + link + '">Next record</a></li>';
	        }
	        prevnext += '</ul>';
	        return prevnext;
	    }
	    else return '';
	},
	
	'NavBarMenuContent': function(content){
	    var menucontent = ''; 
	    if (content.find('.nextprevlinks li.prev').html()){
	        content.find('.nextprevlinks li.prev a').text('Previous segment');
	        menucontent += '<li>' + content.find('.nextprevlinks li.prev').html() + '</li>';
	    }
	    if (content.find('.locals').html()){
	        menucontent += content.find('.locals').html();
	    }
	    if (content.find('.nextprevlinks li.next').html()){
	        content.find('.nextprevlinks li.next a').text('Next segment');
	        menucontent += '<li>' + content.find('.nextprevlinks li.next').html() + '</li>';
	    }
	    return menucontent;
	},
	
	'RemainingNavBarMenu': function(recordindex, iteration){
	    var othis = this;
	    var FlatFileNode = document.getElementById("viewercontent" + recordindex);
	    
	    if (jQuery(FlatFileNode).find('.localnav').html()){
	        var seqid = jQuery(FlatFileNode).attr("val"); 
	        
	        jQuery(FlatFileNode).find('.localnav').each( function(lNavIndex){
                var localNav = jQuery(this);
                var newNav = '';
                    
                newNav = '<div class="hnav" id="hnav' + seqid + '__' + lNavIndex + '">' 
                    + '<div class="goto">' 
                    +    '<a href="#goto' + seqid + '__' + lNavIndex + '" class="tgt_dark jig-ncbipopper" config="' 
                           + "openMethod : 'click', closeMethod : 'click', destPosition: 'bottom left', adjustFit: 'none', triggerPosition: 'bottom left'"
                           + '"' + 'id="gotopopper' + seqid +  '__' + lNavIndex + '">Go to:</a>'
                    + '</div></div>' ;
                        
                var popper = '<div class="tabPopper nonstd_popper" style="display: none;" id="goto' + seqid +  '_' + lNavIndex + '"><ul class="locals">'
                 + othis.NavBarMenuContent(localNav)
                 + '</ul></div>'; 
               
                // replace content
                localNav.replaceWith(newNav);
                jQuery('#hnav' + seqid + '__' + lNavIndex).after(popper);
                jQuery.ui.jig.scan(jQuery('#hnav' + seqid + '__' + lNavIndex));
            });    
	    }
	    else if (iteration <= 5){
            var oThis = this;
            setTimeout(function() { othis.RemainingNavBarMenu(recordindex, iteration + 1); }, 100);
    	}
	}
},

{
    InDownloadCycle: false,
    counter : 0,
    oRemoteDataProvider:new RemoteDataProvider("/sviewer/viewer.fcgi?"),
    displayLongRecord: false,
    master: '',
    regionAvailable: false,
    bitmasksAvailable: false,
    extrafeat: "",
    custom_view:"",
    itemid: '',
    protein_id: '',
    strand: '',
    comp: '',
    to: '',
    from: '',
    downloader: 'off',
    viewer: 'off',
    waiting: false,
    LoadSequenceWithMarkup: false
});



;
/*
*************************************************************************
$Id: seq_search_base.js 328365 2011-08-02 19:12:11Z sponomar $
Common code for the Portal and for the Sequence Viewer
*************************************************************************
*/
//oNotifier.bTraceOn = true;


// --------------------- Common code BEGIN ---------------------

/*
*************************************************************************
*************************************************************************
*/
function Seq_Search_Base() {
    this.NAME = "Seq_Search_Base";

    this.Ids = [];
    this.Totals = {};
    this.Acc = {};
    this.Offset = {};
    this.CurrentId = "";
    this.Current = 0;

    this.oNotifier = new Notifier();
    //    this.oNotifier.bTraceOn = true;

    // messages
    this.oNotifier.Search = 1;
    this.oNotifier.Clear = 2;
    this.oNotifier.DataIsReady = 3;
    this.oNotifier.Init = 4;
    this.oNotifier.SetCurrent = 5;
    this.oNotifier.Next = 6;
    this.oNotifier.First = 7;
    this.oNotifier.Previous = 8;
    this.oNotifier.Last = 9;
    this.oNotifier.ShowSearchBar = 10;
    this.oNotifier.ScrollTo = 12;
    this.oNotifier.NotFound = 13;
    this.oNotifier.Reset = 14;
    
    
    this.oNotifier.setListener(this, this.oNotifier.ScrollTo, function(x, sId) {
        var el = document.getElementById(sId);
        if (!el) {
            el = document.getElementsByName(sId);
            if (el[0]) el = el[0];
        }
        var y = utils.getXY(el).y;
        var iScrollY = utils.getScrolls().y;
        var iH = utils.getWindowDim().h;

        //        console.info(y, iScrollY, iH);

        if (y < iScrollY || y > iScrollY + iH) {
            window.scrollTo(0, y - 150);
        }
    });
}

/*
*************************************************************************
*************************************************************************
*/
Seq_Search_Base.prototype.CheckIfAllSequencesAreLoaded = function() {
    return true;
}

/*
*************************************************************************
*************************************************************************
*/
Seq_Search_Base.prototype.Init = function() {
    alert("You have to override that function");
}

/*
*************************************************************************
*************************************************************************
*/
Seq_Search_Base.prototype.Run = function(oGlobalNotifier) {
    var oThis = this;
    this.oGlobalNotifier = oGlobalNotifier;
    // ----------------------------------------------------------------------------------------
    this.oNotifier.setListener(this, this.oNotifier.Clear, function() {
        // clear previous search result
        x_Reset();
    });
    // ----------------------------------------------------------------------------------------
    this.oNotifier.setListener(this, this.oNotifier.Reset, function() {
        // clear previous search result
        x_Reset();
    });
    // ----------------------------------------------------------------------------------------
    function x_Reset() {
        oThis.Ids = [];
        oThis.Acc = {};
        oThis.Totals = {};
        oThis.Offset = {};
        oThis.CurrentId = "";
        oThis.Current = 0;
        oThis.Totals = {};
    }
}
/*
*************************************************************************
*************************************************************************
*/
Seq_Search_Base.prototype.Search = function() {
    if (this.CheckIfAllSequencesAreLoaded()) {
        this.oNotifier.Notify(this, this.oNotifier.Search);
    } else {
        setTimeout(function() { this.Search(); }, 1000);
    }
}


/*
*************************************************************************
*************************************************************************
*/
function Seq_SearchBar_Base(oSeqSearchData) {
}
/*
*************************************************************************
*************************************************************************
*/
Seq_SearchBar_Base.prototype.Run = function(SeqSearchData, elSearchBar) {
    this.SeqSearchData = SeqSearchData;
    this.elSearchBar = elSearchBar;
    this.oNotifier = this.SeqSearchData.oNotifier;
}

/*
*************************************************************************
*************************************************************************
*/
Seq_SearchBar_Base.prototype.SetListeners = function() {

    var oThis = this;

    //-----------------------------------------------------------------------------------------
    oThis.SeqSearchData.oGlobalNotifier.setListener(this, oThis.SeqSearchData.oGlobalNotifier.HideSearchBar, function() {
        utils.removeClass(document.body, "with-searchbar");
        oThis.elSearchBar.style.display = "none";
        oThis.oNotifier.Notify(this, oThis.oNotifier.Clear);
    });

    //-----------------------------------------------------------------------------------------
    this.oNotifier.setListener(this, this.oNotifier.First, function() {
        oThis.oNotifier.Notify(this, oThis.oNotifier.Previous);
    });

    //-----------------------------------------------------------------------------------------
    this.oNotifier.setListener(this, this.oNotifier.Last, function() {
        oThis.oNotifier.Notify(this, oThis.oNotifier.Next);
    });
}
/*
*************************************************************************
*************************************************************************
*/
Seq_SearchBar_Base.oTimeout = null;
Seq_SearchBar_Base.prototype.Transition = function(el) {
    var color = ["#985735", "#a86745", "#b87755", "#c88765", "#da8", "#ddc", "#eee"];
    len = color.length;
    var t = 1000 / len;
    var i = 0;
    function x_Transition() {
        el.style.backgroundColor = color[i++];
        if (i <= len) {
            if (Seq_SearchBar_Base.oTimeout) clearTimeout(Seq_SearchBar_Base.oTimeout);
            Seq_SearchBar_Base.oTimeout = setTimeout(x_Transition, t);
        }
        else el.style.backgroundColor = color[len -1];
    }
    x_Transition();
}

;
var oFeat_Highlight;
var oData;
Notifier.getInstance().setListener(this, "SEQUENCE_PART_LOADED", function(x, ItemsLeft) {
    if (ItemsLeft > 0) return;
//    console.info("SEQUENCE_PART_LOADED, ",ItemsLeft)
    // IE cannot run script which came with XHTTP request. FF does.
    setTimeout(function() {
        var a = document.querySelectorAll(".feature");
        if (a.length == 0) {
            a = document.querySelectorAll(".seq");
        }
        if (oFeat_Highlight) {
            delete oFeat_Highlight;
        }
        oData = [];
        
        var iGi, j = 0;
        for (var i = 0; i < a.length; ++i) {
        	var b = a[i].getElementsByTagName("script");
        	if (b && b[0]) {
        	    try {
        		    eval(b[0].innerHTML);
        		    var aa = b[0].parentNode.id.split("_");
        		    var iCurrentGi;
        		    if (aa.length == 5) { // feature_NM_131081.2_source_0
        		    	iCurrentGi = aa[1] + "_" + aa[2];
        		    } else {
            		    iCurrentGi = aa[1]; // feature_NM131081.2_source_0
        		    }
        		    if (iGi != iCurrentGi) {
        		        // because we removed Gi from script 'b[0]',
        		        // take Gis from node <span id="feature_<gi>_<number of feature>"
             	        iGi = iCurrentGi;
            	        oData[j++].gi = iGi;
            	    }
       		} catch (e) {
        		    ncbi.sg.ping({
                        jsevent:"sequenceFeature_loaderror", 
                        data: escape(b[0].innerHTML) 
                    });
        		}
        	}
        }
        console.info("oData=", oData);
        
        var x = Portal.Portlet.Sequence_ViewerReport;
        if (x.from > 1 || x.to > 1 || x.itemid > 0) return;

        if (document.getElementById("fh_bar")) {
            for (var i = 0; i < oData.length; ++i) {
                if (oData[i].features) {
                    // skip 'source' and 'gap'
                    for (var f in oData[i].features) {
                        if (f == "source" || f == "gap") continue;
                        // it looks we do have some features
                        oFeat_Highlight = new Feat_Search(oData);
                        return;
                    }
                }
            }
        }
    }, 200);
});

;
/*
*************************************************************************
URLs for test:
http://dev.ncbi.nlm.nih.gov/protein/6 - quick test
http://dev.ncbi.nlm.nih.gov/protein/146231940 - multisegment sites

http://dev.ncbi.nlm.nih.gov/protein/146231940?feature=Site:900 - highlight Site #42 
http://dev.ncbi.nlm.nih.gov/protein/6?feature=any - highlight first existing feature

http://dev.ncbi.nlm.nih.gov/nuccore/2 - sequence does not have any feature
http://dev.ncbi.nlm.nih.gov/nuccore/2,AC_000020?report=gbwithparts - first sequence does not have any feature

http://dev.ncbi.nlm.nih.gov/nuccore/1304378 - multiset sequence
http://dev.ncbi.nlm.nih.gov/nuccore/338770040 - pretty long sequence
http://dev.ncbi.nlm.nih.gov/nuccore/1304378 - very long sequence wich loaded part-by-part by ploader
http://dev.ncbi.nlm.nih.gov/nuccore/GL945016.1 - master record of contig

*************************************************************************
*/
function Feat_Search(oData) {
    this.constructor.call(this, oData);
    this.NAME = "Feat_Search";
	var aParams = utils.getParams(document.location.href.split("?")[1]);
    if (aParams["from"] || aParams["to"] || aParams["itemid"]) return;

    this.oNotifier.Highlight = 100;
    this.oNotifier.Update = 101;
    
    // [cds: [n, "acc", gi, [coords]], 
    this.oData = {};
    for (var i = 0; i < oData.length; ++i) {
        if (oData[i].features) {
            var d = oData[i];
            for (var f in d.features) {
                if ("gap" == f || "source" == f) continue;
                if (!this.oData[f]) this.oData[f] = [];
                for (var j = 0; j < d.features[f].length; ++j) {
                    var x = [];
                    x.push(j);
                    x.push(d.gi);
                    x.push(d.acc);
                    x.push(d.features[f][j]);
                    this.oData[f].push(x);
                }
            }
        }
    }
    
    this.sFeat = "";
    this.iFeat = 0;
    this.iTotal = 0;
    this.sCookieName = "feature_to_highlight";
    
    // &feature=<feature-name>:start[:stop]
    // http://dev.ncbi.nlm.nih.gov/protein/146231940?p$site=/projects/Sequences/SeqDbDev@1.3&report=genpept&feature=Site:46
    if (aParams["feature"] && oData.length == 1) {
	    this.sFeat = aParams["feature"].split("#")[0];
	    if (this.sFeat && this.sFeat != "any") {
	        var a = this.sFeat.split(":");
	        this.sFeat = a[0];
	        if (a[1] != undefined) {
	        	var aa = a[1].split("-");
	        	this.iStartFrom = aa[0];
	        	if (aa[1] != undefined)
	        		this.iStopTo = aa[1];
        		else 
        			this.iStopTo = 0;
	        } else
	        	this.iStartFrom = 0;
	    }
//	    console.info("sFeat=", this.sFeat, ", iStartFrom=", this.iStartFrom, ", iStopTo=", this.iStopTo);
	} else {
		var iGi, iFeat, sFeat;
		var s = utils.readCookie(this.sCookieName);		// feature_146231940_Site_27
		if (s > "") {
			var a = s.split("_");
			if (a.length >= 4) {
				iGi = parseInt(a[1]);
				iFeat = parseInt(a[a.length - 1]);
				var x = [];
				for (var i = 2; i < a.length - 1; ++i) x.push(a[i]);
				sFeat = x.join("_");
				
//				console.info("sFeat=", sFeat, " iGi=", iGi)
				if (this.oData[sFeat]) {
				    for (var i = 0; i < this.oData[sFeat].length; ++i) {
//				        console.info(i, this.oData[sFeat][i][0], iFeat, this.oData[sFeat][i][1], iGi)
				        if (this.oData[sFeat][i][0] == iFeat && this.oData[sFeat][i][1] == iGi) {
        					this.iFeat = i;
        					this.sFeat = sFeat;
        					break;
				        }
				    }
				}
			}
		}
//		console.info("cookie '", this.sCookieName, "'=", s, this.iFeat, this.sFeat);
	} 
	
	this.Run(Notifier.getInstance());
//	console.info('Feat_Search: this.sFeat=', this.sFeat, ', this.iFeat=', this.iFeat, oData)

}

/*
*************************************************************************
*************************************************************************
*/
Feat_Search.prototype.constructor = Seq_Search_Base;

/*
*************************************************************************
*************************************************************************
*/
Feat_Search.prototype.Run = function(oGlobalNotifier) {
//	console.info("Feat_Search.prototype.Run")
//console.info(this.oData)
    var oThis = this;
    this.constructor.prototype.Run.call(this, oGlobalNotifier);


    // ----------------------------------------------------------------------------------------
    if (this.oFeat_SearchHighligt) {
        for (var x in this.oFeat_SearchHighligt) delete this.oFeat_SearchHighligt[x];
        delete this.oFeat_SearchHighligt;
    }
    this.oFeat_SearchHighligt = new Feat_SearchHighligt(this);

    var elSearchBar = document.getElementById("fh_bar");
    if (elSearchBar) {
        if (this.oFeat_SearchBar) {
            for (var x in this.oFeat_SearchBar) delete this.oFeat_SearchBar[x];
            delete this.oFeat_SearchBar;
        }
        this.oFeat_SearchBar= new Feat_SearchBar();
        this.oFeat_SearchBar.Run(this, elSearchBar);
    }

    this.oNotifier.Notify(this, this.oNotifier.Clear);
    if (this.oData == {}) {
        this.oNotifier.Notify(this, this.oNotifier.NotFound);
    } else {
        this.oNotifier.Notify(this, this.oNotifier.DataIsReady);
        if (this.sFeat && this.iFeat >= 0) 
            this.oNotifier.Notify(this, this.oNotifier.Update);
    }
}

/*
*************************************************************************
*************************************************************************
*/
function Feat_SearchBar() {
    this.NAME = "Feat_SearchBar";
    var oThis = this;
}

Feat_SearchBar.prototype = new Seq_SearchBar_Base;
    
/*
*************************************************************************
*************************************************************************
*/
Feat_SearchBar.prototype.Run = function(SearchObj, elSearchBar) {
    var oThis = this;

    var elText = document.getElementById("fh_bar_text");
    var elNavCtrls = document.getElementById("feat_nav_control");
    var elSelect = document.getElementById("fh_bar_select");
    var elNext = document.getElementById("fh_bar_next");
    var elPrevious = document.getElementById("fh_bar_previous");
    var elFirst = document.getElementById("fh_bar_first");
    var elLast = document.getElementById("fh_bar_last");
    var elClear = document.getElementById("fh_bar_clear");
    var elHide = document.getElementById("fh_bar_hide");
    var elRange = document.getElementById("fh_bar_total");
    var elMessage = document.getElementById("fh_bar_message");
    var elWarning = document.getElementById("fh_bar_warning");
    var elHandler = document.getElementById("fh_handler");

    var elGenbank = document.getElementById("fh_bar_genbank");
    var elFasta = document.getElementById("fh_bar_fasta");

    var elDetailsBodyHandler = document.getElementById("fh_bar_details");
    var elDetailsBody = document.getElementById("fh_bar_details_body");
    
    var elGotoFeature = document.getElementById("fh_bar_to_feature");

    this.constructor.prototype.Run.call(this, SearchObj, elSearchBar);
    this.constructor.prototype.SetListeners.call(this);

    // ----------------------------------------------------------------------------------------
    function Update(iDir) {
//        console.info("SearchObj.iStartFrom=", SearchObj.iStartFrom);

        oThis.oNotifier.Notify(this, oThis.oNotifier.ShowSearchBar, iDir == 0);

        if (iDir == 1 || iDir == -1) {
            SearchObj.iFeat += iDir;
        } else if (SearchObj.iStartFrom > 0) {
            var b = true;
            // one sequence on the page and start position for given feature is set.
            var x = SearchObj.oData[SearchObj.sFeat];
            if (x) {
 //               console.info("SearchObj.iStartFrom=", SearchObj.iStartFrom,"SearchObj.iStopTo=", SearchObj.iStopTo, x);
            	if (SearchObj.iStopTo > 0 && SearchObj.iStartFrom > SearchObj.iStopTo) {
            		// reverse coordinates are set
            		var k = SearchObj.iStartFrom;
            		SearchObj.iStartFrom = SearchObj.iStopTo;
            		SearchObj.iStopTo = k;
            	}

				// try to find first feature which starts from or after iStartFrom 
                for (var i = 0; i < x.length; ++i) {
                    var a = x[i][3][0]; // first [start, stop]
                    var iFrom = a[0];
//                    console.info("i=", i, iFrom, SearchObj.iStartFrom)
                    if (iFrom >= SearchObj.iStartFrom) {
                    	// found it!
                        SearchObj.iFeat = i;
                        SearchObj.iStartFrom = iFrom;
                        b = false;
                        break;
                    }
                }
                if (b) {
                	// no any features started from or after iStartFrom found
                    SearchObj.iFeat = 0;
                    SearchObj.iStartFrom = 0;
                } else if (SearchObj.iStopTo > 0) {
                	// look at first feature which stops to or before iStopTo
                	for (var i = SearchObj.iFeat; i < x.length; ++i) {
                		var j = x[i][3].length - 1;
//                		console.info(x[i], x[i][3])
                		var iTo = x[i][3][j][1];
//                		console.info("j=", j, iTo)
                		if (iTo > SearchObj.iStopTo) {
                			// found next feature after one we looked for
                			if (SearchObj.iFeat < i - 1) SearchObj.iFeat = i - 1;
                			break;
                		}
                	}
                }
//                console.info("SearchObj.iStartFrom=", SearchObj.iStartFrom, "SearchObj.iStopTo=", SearchObj.iStopTo, ", SearchObj.iFeat=", SearchObj.iFeat);
            }
            SearchObj.iStartFrom = null; // we do not need it anymore - it has been used at first time.
        }


        if (SearchObj.sFeat == "any" || SearchObj.sFeat == "") {
            SearchObj.sFeat = elSelect.options[0].value;
        }

        var aFeat = SearchObj.oData[SearchObj.sFeat];

        if (!aFeat) {
            oThis.SeqSearchData.oGlobalNotifier.Notify(this, oThis.SeqSearchData.oGlobalNotifier.HideSearchBar);
            alert("Cannot find feature '" + SearchObj.sFeat + "'");
            SearchObj.sFeat = "";
            return;
        }

//    console.info("SearchObj.iFeat=", SearchObj.iFeat)

        if (SearchObj.iFeat <= 0) SearchObj.iFeat = 0;
        if (SearchObj.iFeat == 0) x_DisableFirst(); else x_EnableFirst();

        if (SearchObj.iFeat >= aFeat.length) SearchObj.iFeat = aFeat.length - 1;
        if (SearchObj.iFeat >= aFeat.length - 1 ) x_DisableLast(); else x_EnableLast();
        
        
        var aCurrFeat = aFeat[SearchObj.iFeat];
        var iSegments = aCurrFeat[3].length;
        var bIsComplement = aCurrFeat[3][0][0] > aCurrFeat[3][0][1];
        
        
        elRange.innerHTML = (1 + SearchObj.iFeat) + " of " + aFeat.length;
        elMessage.innerHTML = aCurrFeat[2]
            + " : " + iSegments + " segment" + utils.getPlural(iSegments)
            + (bIsComplement ? " (minus strand)" : "");
        var sFeatId = "feature_" + aCurrFeat[1] + "_" + SearchObj.sFeat + "_" + aCurrFeat[0];
        var elFeatSpan = document.getElementById(sFeatId);
        var elA = utils.getNextSibling(utils.getFirstChild(elFeatSpan));
        //        console.info(elA);
        var b = elA.href.indexOf("item") == -1; // no &itemID/itemid in the URL, see ID-4284
        elGenbank.href = elA.href + "&report=gbwithparts" + (b && bIsComplement ? "&strand=2" : "");
        elFasta.href = elA.href + "&report=fasta" + (b && bIsComplement ? "&strand=2" : "");
        elGotoFeature.href = "#" + sFeatId;
        
        utils.createCookie(SearchObj.sCookieName, sFeatId);
        x_RefreshDetails();

        oThis.oNotifier.Notify(this, oThis.oNotifier.Highlight, aCurrFeat[3]);
        return;


        // ----------------------------------------------------------------------------------------
        function x_DisableFirst() {
            utils.addClass(elFirst, "disabled");
            utils.addClass(elPrevious, "disabled");
            SearchObj.iFeat = 0;
        }

        // ----------------------------------------------------------------------------------------
        function x_EnableFirst() {
            if (utils.hasClass(elFirst, "disabled")) {
                utils.removeClass(elFirst, "disabled");
                utils.removeClass(elPrevious, "disabled");
            }
        }

        // ----------------------------------------------------------------------------------------
        function x_DisableLast() {
            utils.addClass(elLast, "disabled");
            utils.addClass(elNext, "disabled");
        }

        // ----------------------------------------------------------------------------------------
        function x_EnableLast() {
            utils.removeClass(elLast, "disabled");
            utils.removeClass(elNext, "disabled");
        }

    }
    // ----------------------------------------------------------------------------------------
    function x_UpdateDetails(el) {
        elDetailsBody.style.height = 0;
        elDetailsBody.innerHTML = "";
        var a = el.innerHTML.split("                    "); // 20 spaces
        var aa = a[0].split(" ");
        a[0] = aa[aa.length - 1];
        for (var i = 0; i < a.length; ++i) {
            var el = document.createElement("div");
            el.innerHTML = a[i];
            elDetailsBody.appendChild(el);
        }
        ncbi.sg.scanLinks();
 		x_RefreshDetails();
    }
    
        // ----------------------------------------------------------------------------------------
    function x_RefreshDetails() {
    	var el = utils.getParent(elDetailsBodyHandler);
        if (utils.hasClass(elDetailsBody, "is-hidden")) {
            utils.addClass(elDetailsBodyHandler, "tgt_dark_up");
            utils.removeClass(elDetailsBodyHandler, "tgt_dark");
            utils.addClass(el, "is-hidden");
            elDetailsBodyHandler.setAttribute("ref", "ref=discoid=featurehighlight&log$=featurehighlight&sectionAction=open");
            elDetailsBody.style.display = "none";
        } else {
            utils.removeClass(elDetailsBodyHandler, "tgt_dark_up");
            utils.addClass(elDetailsBodyHandler, "tgt_dark");
            utils.removeClass(el, "is-hidden");
            elDetailsBodyHandler.setAttribute("ref", "ref=discoid=featurehighlight&log$=featurehighlight&sectionAction=close");
			var w = 450;
	        var oPageDim = utils.getPageDim();
	        var x = oPageDim.w - w - 20;
	        elDetailsBody.style.left = x  + "px";
	        elDetailsBody.style.width = w + "px";
	        oDetailsBodyDim = utils.getPageDim(elDetailsBody);
	        var h = oDetailsBodyDim.h;
	        elDetailsBody.style.height = h + "px";
	        elDetailsBody.style.top = -(h + 15) + "px";
            elDetailsBody.style.display = "";
        }
    }
    

    // Listener started =======================================================================

    // ----------------------------------------------------------------------------------------
    this.oNotifier.setListener(this, this.oNotifier.Update, function() {
    	Update(0);
    	return true;
	});
    // ----------------------------------------------------------------------------------------
    this.oNotifier.setListener(this, this.oNotifier.ShowSearchBar, function(x, bWithTransitionEffect) {
    	var b = elSearchBar.style.display != "block";
        elSearchBar.style.display = "block";
        if (b && bWithTransitionEffect) oThis.Transition(elSearchBar);
        utils.addClass(document.body, "with-searchbar");
    });

    // ----------------------------------------------------------------------------------------
    this.oNotifier.setListener(this, this.oNotifier.Clear, function() {
    	elWarning.style.display = "none";
 		elWarning.innerHTML = "";
    });

    // ----------------------------------------------------------------------------------------
    this.oNotifier.setListener(this, this.oNotifier.NoSequence, function() {
 		elWarning.innerHTML = "Warning: Cannot highlight feature because no sequence is shown. "
 		+ "<a href='#' onclick=\"document.location.search += '&withparts=on&expand-gaps=on'\">Show the sequence</a>";
 		elWarning.style.display = "";
    });


    // ----------------------------------------------------------------------------------------
    this.oNotifier.setListener(this, this.oNotifier.DataIsReady, function() {
//        console.info("DataIsReady, ", SearchObj.oData.length);
        // get list of unique features for all sequences on the page
        // sort features case insensitive
        var a = [];
        for (var f in SearchObj.oData) a.push(f);
        
        a = a.sort(function(x,y){ 
	      var a = String(x).toUpperCase(); 
	      var b = String(y).toUpperCase(); 
	      if (a > b) return 1 
	      if (a < b) return -1 
	      return 0; 
	    });
        
        
        // create pop-up menu with features 
        utils.removeChildren(elSelect);
        for (var i = 0; i < a.length; ++i) {
        	if (a[i] == "source") continue;
            var el = document.createElement("option");
            el.innerHTML = a[i];
            el.setAttribute("value", a[i]);
            if (SearchObj.sFeat == a[i]) el.setAttribute("selected", "selected");
            elSelect.appendChild(el);
        }
        elMessage.innerHTML = "";
        utils.removeClass(elNavCtrls, "hide");

        if (SearchObj.iStartFrom > 0) Update(0);

        elDetailsBodyHandler.onclick = function(e) {
            e = e || event;
            utils.preventDefault(e);
            utils.toggleClass(elDetailsBody, "is-hidden");
            Update(0);
        };

        for (var sFeat in SearchObj.oData) {
//            console.info(sFeat);
            for (var i = 0; i < SearchObj.oData[sFeat].length; ++i) {
                var x = SearchObj.oData[sFeat][i];
                var iGi = x[1];
                var iFeatLocal = x[0];
                var s = "feature_" + iGi + "_" + sFeat + "_" + iFeatLocal;
                var el = document.getElementById(s);
                if (!el) continue;
                el = utils.getFirstChild(el);
                if (!el) continue;
                el = utils.getNextSibling(el, "a");
                if (!el) continue;
                el.setAttribute("igi", iGi);
                el.setAttribute("sfeat", sFeat);
                el.setAttribute("ifeat", i);
                el.setAttribute("ref", "discoid=featurehighlight&log$=featurehighlight");
                utils.addClass(el, "pseudolink");
                el.onclick = x_GotoFeature;
            }
        }

        // ----------------------------------------------------------------------------------------
        function x_GotoFeature(e) {
            e = e || event;
            utils.preventDefault(e);
            oThis.SeqSearchData.oGlobalNotifier.Notify(this, oThis.SeqSearchData.oGlobalNotifier.HideSearchBar);
            SearchObj.iFeat = parseInt(this.getAttribute("ifeat"));
            var sFeat = this.getAttribute("sfeat");
            if (SearchObj.sFeat != sFeat) {
                SearchObj.sFeat = sFeat;
                for (var i = 0; i < elSelect.options.length; ++i) {
                    var el = elSelect.options[i];
                    if (el.value == sFeat) {
                        el.setAttribute("selected", "selected");
                   } else 
                       el.removeAttribute("selected");
                }
            }

            var el = utils.getParent(this);
            x_UpdateDetails(el);
            SearchObj.iStartFrom = null;
//            console.info("Update x_GotoFeature")
            Update(0);
            return false;
        }

    });

    //-----------------------------------------------------------------------------------------
    this.oNotifier.setListener(this, this.oNotifier.Highlight, function(x, data) {
        var x = SearchObj.oData[SearchObj.sFeat][SearchObj.iFeat];
        var iGi = x[1];
        var iFeatLocal = x[0];
        var s = "feature_" + iGi + "_" + SearchObj.sFeat + "_" + iFeatLocal;
//        console.info(s);
        var el = document.getElementById(s);
        x_UpdateDetails(el);
    });


    // ----------------------------------------------------------------------------------------
    this.oNotifier.setListener(this, this.oNotifier.NotFound, function() {
        utils.removeChildren(elSelect);
        var el = utils.getParent(elSelect);
        utils.removeChildren(el);
        el.innerHTML = "No feature is found";
    });


    // ----------------------------------------------------------------------------------------
    this.oNotifier.setListener(this, this.oNotifier.Next, function() {
        Update(1);
    });

    // ----------------------------------------------------------------------------------------
    this.oNotifier.setListener(this, this.oNotifier.Previous, function() {
        Update(-1);
    });

    // Listeners ended =========================================================================

    // Events started ==========================================================================
	// all events have to be set only once!
    //-----------------------------------------------------------------------------------------
    if (elHandler) elHandler.onclick = function(e) {
        e = e || event;
        utils.preventDefault(e);
        oThis.oNotifier.Notify(this, oThis.oNotifier.Clear);
        SearchObj.oGlobalNotifier.Notify(this, SearchObj.oGlobalNotifier.HideSearchBar);
        oThis.oNotifier.Notify(this, oThis.oNotifier.ShowSearchBar, true); // show with transition effect
    };

    //-----------------------------------------------------------------------------------------
    elSelect.onchange = function(e) {
        e = e || event;
        utils.preventDefault(e);
        
        SearchObj.sFeat = this.options[this.selectedIndex].value;
        Update(0);
        var x = SearchObj.oData[SearchObj.sFeat][SearchObj.iFeat];
        
        var obj = {jsevent:"fh_bar_menuchange"
        	, ncbi_uid:x[1] 
        	, ncbi_accn:x[2] 
        	, feature_type:SearchObj.sFeat}; 
        ncbi.sg.ping(obj);
    };

    //-----------------------------------------------------------------------------------------
    elNext.onclick = function(e) {
        e = e || event;
        utils.preventDefault(e);
        if (!utils.hasClass(this, "disabled"))
            oThis.oNotifier.Notify(this, oThis.oNotifier.Next);
    };

    //-----------------------------------------------------------------------------------------
    elPrevious.onclick = function(e) {
        e = e || event;
        utils.preventDefault(e);
        if (!utils.hasClass(this, "disabled"))
            oThis.oNotifier.Notify(this, oThis.oNotifier.Previous);
    };

    //-----------------------------------------------------------------------------------------
    elFirst.onclick = function(e) {
        e = e || event;
        utils.preventDefault(e);
        if (utils.hasClass(this, "disabled")) return;
        SearchObj.iFeat = 0;
        oThis.oNotifier.Notify(this, oThis.oNotifier.First);
    };

    //-----------------------------------------------------------------------------------------
    elLast.onclick = function(e) {
        e = e || event;
        utils.preventDefault(e);
        if (utils.hasClass(this, "disabled")) return;
        SearchObj.iFeat = SearchObj.oData[SearchObj.sFeat].length - 1;
//        console.info("SearchObj.iFeat=", SearchObj.iFeat)
        oThis.oNotifier.Notify(this, oThis.oNotifier.Last);
    };

    //-----------------------------------------------------------------------------------------
   elHide.onclick = function(e) {
        e = e || event;
        utils.preventDefault(e);
        oThis.oNotifier.Notify(this, oThis.oNotifier.Clear);
        utils.eraseCookie(SearchObj.sCookieName, true);
        SearchObj.oGlobalNotifier.Notify(this, SearchObj.oGlobalNotifier.HideSearchBar);
    };
}


/*
*************************************************************************
*************************************************************************
*/
function Feat_SearchHighligt(SearchObj) {
    this.NAME = "Seq_SearchHighligt";
    var oThis = this;
    var oNotifier = SearchObj.oNotifier;

    var Cache = {};
    var iLineLength = 60;

    //-----------------------------------------------------------------------------------------
    oNotifier.setListener(this, oNotifier.Clear, function(x, a) {
//      restore original content from cahce
        var el;
        for (var id in Cache) {
            el = document.getElementById(id);
            if (el) el.innerHTML = Cache[id];
        }
        Cache = {};
    });
    

    //-----------------------------------------------------------------------------------------
    oNotifier.setListener(this, oNotifier.Highlight, function(x, a) {
        oNotifier.Notify(this, oNotifier.Clear);
//        console.info(SearchObj.oData)
        var el;        
        var sId = SearchObj.oData[SearchObj.sFeat][SearchObj.iFeat][1] + "_";
//        console.info("sId=", sId)
        var sText = "";
        var sLinId = "";
        var sBuff = "";
        var prev_stop = 0;
        for (var i = 0; i < a.length; ++i) {
            var start = a[i][0];
            var stop = a[i][1];
            if (start > stop) {
                var xx = start; start = stop; stop = xx;
            }
            var iStart = Math.floor((start - 1) / iLineLength) * iLineLength + 1;
            var iStop = Math.floor((stop - 1) / iLineLength) * iLineLength + 1;
            
            //console.info("iStart=", iStart, ", iStop=" , iStop);

            for (var j = iStart; j <= iStop; j += iLineLength) {
                var sNewLineId = sId + j;
                //console.info("sNewLineId=", sNewLineId)
                if(!document.getElementById(sNewLineId)) {
                	/* see ID-4512
                	// https://dev.ncbi.nlm.nih.gov/nuccore/AH003527.2?&feature=CDS
                	4441 cttgtacatg gaaatgtcct gtttac                                     
                    [gap 100 bp]    Expand Ns
                    4567       tcct cattcatcat tgtttctttt cacatagaac aagtgtttcc cttgtccaag               	
                	*/                	
                	var b = false;
                	for(var k = j; k < j + iLineLength && k <= iStop; k++) {
                		//console.info(sId+ k, document.getElementById(sId + k));
                		b = !!document.getElementById(sId + k);
                		if (b) break;
                	}
                	if (b) {
                		sNewLineId = sId + k;
                	} else {
	                	oNotifier.Notify(this, oNotifier.NoSequence);
	                	return;
                	}
                }
                if (sNewLineId != sLinId) {
                    // flush buffered data
                    if (el) el.innerHTML = sBuff + sText;

                    sLinId = sNewLineId;
                    el = document.getElementById(sLinId);
                    sText = el.innerHTML;
                    Cache[sLinId] = sText;
                    sBuff = "";
                    prev_stop = 0;
                }

//                console.info("segment=", i, ", line_id=", j, ", strat=", start, ", stop=", stop, ", prev_stop=", prev_stop);
//                console.info(sText);

                if (start <= j && stop >= j + iLineLength) {
                    // whole line should be highlighted
                    sBuff = "<span class='feat_h'>" + sText + "</span>";
                    sText = "";
                } else {
                    var s1, s2;
                    var k1 = start - j;
                    var k2 = stop - j + 1;
                    if (k2 > j + iLineLength) k2 = iLineLength;
                    k2 += Math.floor(k2 / 10) - prev_stop;

//                    console.info("k1=", k1, ", k2=", k2, ", prev_stop=", prev_stop);

                    if (k1 > 0) {
                        k1 += Math.floor(k1 / 10) - prev_stop;
                        s1 = sText.substr(0, k1);
                    } else {
                        k1 = 0;
                        s1 = "";
                    }

                    s2 = sText.substr(k1, k2 - k1);
                    sText = sText.substr(k2, sText.length);
                    prev_stop += k2;

//                    console.info("s1='" + s1 + "' s2='" + s2 + "', sText='" + sText + "'");
                    sBuff += s1
                        + (s2 != "" ? "<span class='feat_h'>"
                        + (s2[s2.length - 1] == " " ? s2.substr(0, s2.length - 1) + "</span>" + " " : s2 + "</span>")
                          : "");
//                    console.info("sBuff=", sBuff);

                }
            }
            if (sBuff) el.innerHTML = sBuff + sText;
            oNotifier.Notify(this, oNotifier.ScrollTo, sId + iStart);
        }
    });

}
   
// --------------------- Common code END ---------------------




;
(function( $ ){ // pass in $ to self exec anon fn

    // on page ready    
    
        $( 'div.portlet' ).each( function() {

            // get the elements we will need
            var $this = $( this );
            var anchor = $this.find( 'a.portlet_shutter' );
            var portBody = $this.find( 'div.portlet_content' );

            // we need an id on the body, make one if it doesn't exist already
            // then set toggles attr on anchor to point to body
            var id = portBody.attr('id') || $.ui.jig._generateId( 'portlet_content' );
            portBody.attr('id', id );
            anchor.attr('toggles', id );

            // initialize jig toggler with proper configs, then remove some classes that interfere with 
            // presentation
            var togglerOpen = anchor.hasClass('shutter_closed')? false : true; 
            anchor.ncbitoggler({
                isIcon: false,
                initOpen: togglerOpen 
            }).
                removeClass('ui-ncbitoggler-no-icon').
                removeClass('ui-widget');

            // get rid of ncbitoggler css props that interfere with portlet styling, this is hack
            // we should change how this works for next jig release
            anchor.css('position', 'absolute').
                css('padding', 0 );

            $this.find( 'div.ui-helper-reset' ).
                removeClass('ui-helper-reset');

            portBody.removeClass('ui-widget').
                css('margin', 0);

            // trigger an event with the id of the node when closed
            anchor.bind( 'ncbitogglerclose', function() {
                anchor.addClass('shutter_closed');
            });

            anchor.bind('ncbitoggleropen', function() {
                anchor.removeClass('shutter_closed');
            });

        });  // end each loop and end on page ready
})( jQuery );
/*
jQuery(document).bind('ncbitogglerclose ncbitoggleropen', function( event ) {
           var $ = jQuery;
           var eventType = event.type;
           var t = $(event.target);
           
          alert('event happened ' + t.attr('id'));
   
           if ( t.hasClass('portlet_shutter') || false ) { // if it's a portlet
               // get the toggle state
               var sectionClosed = (eventType === 'ncbitogglerclosed')? 'true' : 'false';
               alert ('now call xml-http');

            }
        });
*/

Portal.Portlet.NCBIPageSection = Portal.Portlet.extend ({
	init: function (path, name, notifier){
		this.base (path, name, notifier);
		
		this.AddListeners();
	},
    
	"AddListeners": function(){
        var oThis = this;
        
		jQuery(document).bind('ncbitogglerclose ncbitoggleropen', function( event ) {
            var $ = jQuery;
            var eventType = event.type;
            var t = $(event.target);
            
            // proceed only if this is a page section portlet {
            if ( t.hasClass('portlet_shutter')){
                var myid = '';
                if (oThis.getInput("Shutter")){
                    myid = oThis.getInput("Shutter").getAttribute('id');
                }
    
                // if the event was triggered on this portlet instance
                if (t.attr('id') && t.attr('id') == myid){
                    // get the toggle state
                    var sectionClosed = (eventType === 'ncbitogglerclose')? 'true' : 'false';
                    // react to the toggle event
                    oThis.ToggleSection(oThis.getInput("Shutter"), sectionClosed);
                }
            } // if portlet            
        });
	},
	
	"ToggleSection": function(target, sectionClosed){
	   // if remember toggle state, save the selection and log it
	   if (target.getAttribute('remembercollapsed') == 'true'){
	       this.UpdateCollapsedState(target, sectionClosed);
	   }else {
	       this.LogCollapsedState(target, sectionClosed);
	   }
	},
	
	"UpdateCollapsedState": function(target, sectionClosed){
	    var site = document.forms[0]['p$st'].value;
	    var args = { "PageSectionCollapsed": sectionClosed, "PageSectionName": target.getAttribute('pgsec_name')};
	    // Issue asynchronous call to XHR service
        var resp = xmlHttpCall(site, this.getPortletPath(), "UpdateCollapsedState", args, this.receiveCollapse, {}, this);  
	},
	
	"LogCollapsedState": function(target, sectionClosed){
	    var site = document.forms[0]['p$st'].value;
	    // Issue asynchronous call to XHR service
        var resp = xmlHttpCall(site, this.getPortletPath(), "LogCollapsedState", {"PageSectionCollapsed": sectionClosed}, this.receiveCollapse, {}, this);  
	},
	
	'getPortletPath': function(){
        return this.realname;
    }, 
    
    receiveCollapse: function(responseObject, userArgs) {
    }
	
});
		 
;
Portal.Portlet.Sequence_ViewerChangeRegion = Portal.Portlet.extend({

	init: function(path, name, notifier) {
		console.info("Created Sequence_ViewerChangeRegion");
		this.base(path, name, notifier);
		
		if (document.getElementById('HiddenViewerChangeRegion')){
		    this.SendBlankRegionData();
		}
		else {
		    Portal.Portlet.Sequence_ViewerChangeRegion.region = this.GetRegionOption();
		    this.RegionData(Portal.Portlet.Sequence_ViewerChangeRegion.region);
	    }
	},
	
    send: { 
   		'SelectedRegion': null
	},	
	
	listen: {
	
	    "From<click>": function(e, target, name){
	        document.getElementById("crselregion").checked = true;
	        if (target.value == 'begin'){
	            target.value = '';
	        }
	    },
	    
	    "To<click>": function(e, target, name){
	        document.getElementById("crselregion").checked = true;
	        if (target.value == 'end'){
	            target.value = '';
	        }
	    },
	    
	    "From<keypress>": function(e, target, name){
	        document.getElementById("crselregion").checked = true;
	        if (target.value == 'begin'){
	            target.value = '';
	        }
	        
	        this.CheckRegionKeyPress(e, target);
	    },
	    
	    "To<keypress>": function(e, target, name){
	        document.getElementById("crselregion").checked = true;
	        if (target.value == 'end'){
	            target.value = '';
	        }
	        
	        this.CheckRegionKeyPress(e, target);
	    },
	    
	    "From<blur>": function(e, target, name){
	        if (target.value < 2){
	            target.value = 'begin';
	        }
	    },
	    
	    "To<blur>": function(e, target, name){
	        if (target.value == ''){
	            target.value = 'end';
	        }
	    },
	    
	    "SetSelRegion<click>": function(e, target, name){
	        e.preventDefault();
	        this.UpdateRegion(target);
	    },
	    
	        // messages 
	    'Bitmask' : function(sMessage, oData, sSrc) {
	        if (oData.master && oData.master == 'true'){
	            var bFromToIsSet = document.getElementById("crfrom") && document.getElementById("crto") 
	        	&& (document.getElementById("crfrom").value > 0 || document.getElementById("crto").value > 0);

	            if (!document.getElementById("crwholeregion").checked && !bFromToIsSet){
	                document.getElementById("crwholeregion").checked = true;
	                this.UpdateRegion();
	            }
	        }
	    }
	},
	
	CheckRegionKeyPress: function(e, target){
        if (!e){
            e = utils.fixEvent(window.event);
        }
	    if ((e.keyCode || e.which) == 13) {
	        this.UpdateRegion(target);
    	    e.returnValue = false;
        	if (e.stopPropagation != undefined)
                e.stopPropagation();   
        	if (e.preventDefault != undefined)
                e.preventDefault();   
    	    return false;
        }
	},
	
	UpdateRegion: function(target){
	    var val = this.GetRegionOption();
        if (val != Portal.Portlet.Sequence_ViewerChangeRegion.region){
            this.RegionData(val);
            // update region
            Portal.Portlet.Sequence_ViewerChangeRegion.region = val;
        }else if (val == 'sel'){
             this.RegionData(val);
        }else{
            if (this.getValue("From") != 'begin'){
                this.setValue("From", 'begin');
            }
            if (this.getValue("To") != 'end'){
                this.setValue("To", 'end');
            }
        }
        
        // xml-http call to log this click 
        var site = document.forms[0]['p$st'].value;
        var from = this.getValue("From")
        var to = this.getValue("To")
        var args = {
            "Region": val,
            "From": from,
            "To": to,
            "ItemId": this.getValue("ItemId")
        };
        var resp = xmlHttpCall(site, this.realname, "SetSelRegion", args, this.receive, {}, this);
	},
	
	GetRegionOption: function(){
	    var value = '';
	    var options = this.getInputs("ChangeRegion");
	    for (var i=0; i<options.length; i++){
	        if (options[i].checked) {
				value = options[i].value;
				break;
			}
	    }
	    return value;
	},
	
	RegionData:function(region){
	    var to = '';
	    var from = '';
	    var itemid = '';
	    var max = parseInt(this.getValue('Max'));
	    var master = '';
	    
	    if (region == 'multi'){
	        itemid = this.getValue("ItemId");
	    }
	    else if (region == 'sel'){
	        // get value of From
            from = parseInt(this.CheckValue(this.getValue('From')));
            if (isNaN(from)) from = 0;
            // get the value of To
            to = parseInt(this.CheckValue(this.getValue('To')));
            if (isNaN(to)) to = max;
            if (this.getValue('Topology') !== "circular" && from > to) { // ID-5138
            	// https://dev.ncbi.nlm.nih.gov/nuccore/X60065.1/ - linear
            	// https://dev.ncbi.nlm.nih.gov/nuccore/CP042270.1 - circular
            	var x = from;
            	var from = to;
            	var to = x;
            }
            // do not swap 'from', 'to' if from > to. /sviewer/flatfile.cgi will manage it itself. (ID-5076)  
            
            
	    } // end else if (region == 'sel')
	    
	    if (region != 'multi' && Portal.Portlet.Sequence_ViewerChangeRegion.region == 'multi'){
	        this.setValue("ItemId", '');   
	        // hide 
            document.getElementById('crmultiregionsection').style.display = 'none';
	    }
	    
	    // update to and from values on screen 
        if (from == '' || from <= 1){
            from = '';
            this.setValue("From", 'begin');
        }
        else{
            this.setValue("From", from);
        }
        
        if (to == '' || to == max){
            to = '';
            this.setValue("To", 'end');
        }
        else{
            this.setValue("To", to);
        }
        
        // master
        if (this.getInput('Contig') && this.getValue('Contig') == 'true'){ 
            if (from != '' || to != '' || itemid != ''){
                master = 'false'; 
            } else {
                master = 'true';
            }
        }
        
        //alert("message- from:" + from + " to:" + to + " itemid:" + itemid + " master" + master);
	    // send message
        this.send.SelectedRegion({
            'from': from,
            'to': to,
            'itemid': itemid,
            'length': max,
            'master': master
        });
	    
	}, // end RegionData()
	
	CheckValue: function(val){
        var max = parseInt(this.getValue('Max'));
	    
	    // allow comma in number
        val = val.replace(/,/,'');
        val = parseInt(val);
	    // if non numeric, set to default
        if (isNaN(val)){
            val = '';
        }
        else {
            // convert to positive integer
            val = Math.round(Math.abs(val));
            // zero is same as default
            if (val == 0){
                val = '';
            }// if the value is greater than the maximum, set at max
            else if (val > max){
                val = max;
            }
        }
        
        return val;
	}, // CheckValue
	
    receive: function(responseObject, userArgs) {
    },
    
    'SendBlankRegionData': function(){
        this.send.SelectedRegion({
            'from': '',
            'to': '',
            'itemid': '',
            'length': 0,
            'master': ''
        });
	}
	
},
{
    region: 'whole'
});
;
Portal.Portlet.Sequence_ViewerCustomizer = Portal.Portlet.extend({

	init: function(path, name, notifier) {
		console.info("Created Sequence_ViewerCustomizer");
		this.base(path, name, notifier);
		
		//if (this.getInput("FmtMask") && this.getValue("FmtMask") != ''){
		//    this.CheckBitsAndSetOptions(this.getValue("FmtMask") * 1);
		//}
        
		// set defaults for 'Customized view'
		//this.CheckBitsAndSetOptions();
		
        if (document.getElementById('SCDshowmaster') && document.getElementById('SCDshowmaster').checked){
            document.getElementById('CustomizableOptions').style.display = 'none';
        }
        if (this.getInput("Customized") && this.getValue("Customized") == 'true'){
            this.send.Customized();
        }
        
        this.AdvisoryMessages('pageinit');
		this.SendData();
		
		var elCustomize = document.getElementById("SCDshowcustomize");
        var el = Portal.Portlet.Sequence_ViewerCustomizer.elWarningMessage;
        if (el) {
            el = el.parentNode.parentNode;
    		el.style.display = (elCustomize.checked ? "none" : "");
		}
	},
	
    send: { 
   		'Bitmask': null,
   		'AdvisoryMessage': null,
   		'Customized': null
	},	
	
	listen: {
	        // events
	    "Customize<click>": function(e, target, name){
            var el = Portal.Portlet.Sequence_ViewerCustomizer.elWarningMessage;
            if (el) el = el.parentNode.parentNode;
	        if (document.getElementById('SCDshowmaster').checked){
                document.getElementById('CustomizableOptions').style.display = 'none';
                if (el) el.style.display = '';
            } else {
                document.getElementById('CustomizableOptions').style.display = 'block';
                if (el) el.style.display = 'none';
            }
	    },
	    
	    "BasicFeatures<click>": function(e, target, name){
	        // people cannot choose selected Basic Features and any NCBI feature at the same time 
	        if (document.getElementById('SCDshowsel').checked){
                if (document.getElementById('SCDsnp')){
                    document.getElementById('SCDsnp').checked = false;
                    document.getElementById('SCDsnp').disabled = true;
                }
                if (document.getElementById('SCDcdd')){
                    document.getElementById('SCDcdd').checked = false;
                    document.getElementById('SCDcdd').disabled = true;
                }
                if (document.getElementById('SCDhprd')){
                    document.getElementById('SCDhprd').checked = false;
                    document.getElementById('SCDhprd').disabled = true;
                }
            }
            else{
                if (document.getElementById('SCDsnp')){
                    document.getElementById('SCDsnp').disabled = false;
                }
                if (document.getElementById('SCDcdd')){
                    document.getElementById('SCDcdd').disabled = false;
                }
                if (document.getElementById('SCDhprd')){
                    document.getElementById('SCDhprd').disabled = false;
                }
            }
	    },
	    
	    "ShowSeq<click>": function(e, target, name){
	        // When ShowSequence option is changed by user, unless they have previously changed it and clicked Do It,
	        // signalled by having UserChangedShowSequence set to true, set UserTouchedShowSequence to true
	        if (!Portal.Portlet.Sequence_ViewerCustomizer.UserChangedShowSequence){
	            Portal.Portlet.Sequence_ViewerCustomizer.UserTouchedShowSequence = true;
	        }
	    },
	        
	    "SetView<click>": function(e, target, name){
	        e.preventDefault();
	    
	        // send message to indicate this portlet was used to customize features
	        this.send.Customized();
	    
	        // when DoIt is clicked, if ShowSequence was touched then change ShowSequenceChanged unless master is selected
	        if (Portal.Portlet.Sequence_ViewerCustomizer.UserTouchedShowSequence){
	            if (document.getElementById('SCDshowmaster') && document.getElementById('SCDshowmaster').checked){
                } 
                else{
                    // reset UserTouchedShowSequence so that this check is not run every time
                    Portal.Portlet.Sequence_ViewerCustomizer.UserChangedShowSequence = true;
                    Portal.Portlet.Sequence_ViewerCustomizer.UserTouchedShowSequence = false;
                }
            }
            
            
            // set values corresponding to checkboxes (so that the false values can also be received from unchecked checkboxes)
            if (document.getElementById('SCDsnp')){
                this.setValue("ShowSNPs", document.getElementById('SCDsnp').checked);
            }
            if (document.getElementById('SCDcdd')){
                this.setValue("ShowCDDs", document.getElementById('SCDcdd').checked);
            }
            if (document.getElementById('SCDhprd')){
                this.setValue("ShowHPRDs", document.getElementById('SCDhprd').checked);
            }
            if (document.getElementById('SCDshowseq')){
                this.setValue("ShowSeq", document.getElementById('SCDshowseq').checked);
            }
            if (document.getElementById('SCDshowgap')){
                this.setValue("ShowGap", document.getElementById('SCDshowgap').checked);
            }
            if (document.getElementById('SCDstrand')){
                this.setValue("Strand", document.getElementById('SCDstrand').checked);
            }           
            
            // Update messages
            this.AdvisoryMessages('pageupdate');
            
            // Send Customize related information
	        this.SendData();
	        
	        
	        // xml http call for logging current options. Print only if option is displayed  
	        var site = document.forms[0]['p$st'].value;
	        var basic = document.getElementById('SCDshowsel') ? 
	            (document.getElementById('SCDshowsel').checked ? document.getElementById('SCDshowsel').value : 'all') 
	            : "";
	        var snp = document.getElementById('SCDsnp') ? document.getElementById('SCDsnp').checked : "";
	        var cdd = document.getElementById('SCDcdd') ? document.getElementById('SCDcdd').checked : "";
	        var hprd = document.getElementById('SCDhprd') ? document.getElementById('SCDhprd').checked : "";
	        var seq = document.getElementById('SCDshowseq') ? document.getElementById('SCDshowseq').checked : "";
	        var gap = document.getElementById('SCDshowgap') ? document.getElementById('SCDshowgap').checked : "";
	        var strand = document.getElementById('SCDstrand') ? document.getElementById('SCDstrand').checked : "";
	        var master = document.getElementById('SCDshowmaster') ? document.getElementById('SCDstrand').checked : "";
            var args = {
                "BasicFeatures": basic,
                "ShowSNPs": snp,
                "ShowCDDs": cdd,
                "ShowHPRDs": hprd,
                "ShowSeq": seq,
                "ShowGap": gap,
                "Strand": strand,
                "MasterView": master
            };
            var resp = xmlHttpCall(site, this.realname, "SetView", args, this.receive, {}, this);
	    },
	    
	        // messages
        'SelectedRegion' : function(sMessage, oData, sSrc) {         	
        	return; // see ID-4847 Portlets "Change region shown" and "Customize view" are independent of each other.
/*        	
            var masterChanged = false;
            var ShowSeqChanged = false;
            
            // master
            if (oData.master && oData.master == 'false'){
                if (document.getElementById('SCDshowcustomize') && !document.getElementById('SCDshowcustomize').checked){
                    document.getElementById('SCDshowcustomize').checked = true;
                    document.getElementById('CustomizableOptions').style.display = 'block';
                    masterChanged = true;
                }
            } else if (oData.master){
                if (document.getElementById('SCDshowmaster') && !document.getElementById('SCDshowmaster').checked){
                    document.getElementById('SCDshowmaster').checked = true;
                    document.getElementById('CustomizableOptions').style.display = 'none';
                    masterChanged = true;
                }
            }
            
            // change ShowSeq only if user has not already changed it themselves
            if (document.getElementById('SCDshowseq') 
                && !Portal.Portlet.Sequence_ViewerCustomizer.UserChangedShowSequence){
    	        var max = this.getValue('MaxLenForShowSeq');
    	        
    	        if (oData.to > 0 && oData.from > 0){
    	            if ((oData.to - oData.from) < max){
    	                if (!document.getElementById('SCDshowseq').checked){
    	                    document.getElementById('SCDshowseq').checked = true;
    	                    ShowSeqChanged = true;
    	                }
    	            }
    	        } else if (oData.to > 0){
    	            if (oData.to < max && !document.getElementById('SCDshowseq').checked){
                        document.getElementById('SCDshowseq').checked = true;
                        ShowSeqChanged = true;
    	            }
    	        } else if (oData.from > 0){
    	            var seqlen = this.getValue('SeqLength');
    	            if ((seqlen - oData.from) < max && !document.getElementById('SCDshowseq').checked){
                        document.getElementById('SCDshowseq').checked = true;
                        ShowSeqChanged = true;
    	            }
    	        } 
    	        
    	        // xml http for logging to say that we changed ShowSequence if we did
    	        if (ShowSeqChanged){
    	            // ######### it's not a user change, so not logging it now
    	        }
    	        
            }// if showseq checkbox is present
            
            // send data in message
            if (masterChanged || ShowSeqChanged){
                this.AdvisoryMessages('pageupdate');
                this.SendData();
            }
            */
	    },  
	    
        'ChangeShowSequence' : function(sMessage, oData, sSrc) {
            var ShowSeqChanged = false;
            var ShowGapChanged = false;
            var masterChanged = false;
            
            //first check for master option, then switch show sequence
            if (document.getElementById('SCDshowcustomize') && !document.getElementById('SCDshowcustomize').checked){
                document.getElementById('SCDshowcustomize').checked = true;
                document.getElementById('CustomizableOptions').style.display = 'block';
                masterChanged = true;
            }
                
            if (oData.showseq == 'yes'){
                if (!document.getElementById('SCDshowseq').checked){
                    document.getElementById('SCDshowseq').checked = true;
                    ShowSeqChanged = true;
                }
            }
            else if (oData.showseq == 'no'){
                if (document.getElementById('SCDshowseq').checked){
                    document.getElementById('SCDshowseq').checked = false;
                    ShowSeqChanged = true;
                }
            }

            if (oData.showgap == 'yes'){
                if (!document.getElementById('SCDshowgap').checked){
                    document.getElementById('SCDshowgap').checked = true;
                    ShowGapChanged = true;
                }
            }

            // send data in message
            if (ShowSeqChanged || masterChanged || ShowGapChanged){
                this.AdvisoryMessages('pageupdate');
                this.SendData();
            }
	    }
	},     // end listen

	/*
	CheckBitsAndSetOptions: function(fmt_mask){
	    // SCDshowall => default features
		// SCDshowsel => Gene, RNA, and CDS features only
		// SCDshowseq => Show sequence
		return;
		console.info("Portal.Portlet.Sequence_ViewerCustomizer.custom_view=", Portal.Portlet.Sequence_ViewerCustomizer.custom_view);
		
		
	    if (document.getElementById('SCDshowall')){
    	    var SCDshowselBit = 128 + 32 + 8 + 256;
    	    if (fmt_mask & SCDshowselBit){
    	        document.getElementById('SCDshowsel').checked = true;
    	        document.getElementById('SCDshowall').checked = false;
    	    }
    	    else{
    	        document.getElementById('SCDshowall').checked = true;
    	        document.getElementById('SCDshowsel').checked = false;
    	    }
	    }
	    
	    if (document.getElementById('SCDshowseq')){
    	    var HideSequenceBit = 32768;
    	    if (fmt_mask & HideSequenceBit){
    	        document.getElementById('SCDshowseq').checked = false;
    	    }
    	    else{
    	        document.getElementById('SCDshowseq').checked = true;
    	    }  
	    }
	    
	}, // end CheckBitsAndSetOptions
	*/
	SendData: function(){
        var extrafeat = this.getValue("extrafeat");
        console.info("extrafeat=", extrafeat);
        var strand = '';
        var master = '';
        var custom_view = [];
         
        if (document.getElementById('SCDshowmaster') && document.getElementById('SCDshowmaster').checked){
            master = 'true';
        } else {
        	custom_view.push("conwithfeat=on");

            // basic features
            if (document.getElementById('SCDshowsel') && document.getElementById('SCDshowsel').checked){  
                //fmt_mask += 128 + 32 + 8 + 256;
            	custom_view.push("basic_feat=on");
            }
            
            /*
            if (extrafeat  === "") {
	            // ncbi features
            	var ncbi_extrafeat = 0;
	            if (document.getElementById('SCDsnp')){
	                if (document.getElementById('SCDsnp').checked){
	                	ncbi_extrafeat += (document.getElementById('SCDsnp').getAttribute('bitmask') * 1);
	                }
	            }
	            if (document.getElementById('SCDcdd')){
	                if (document.getElementById('SCDcdd').checked){
	                	ncbi_extrafeat += (document.getElementById('SCDcdd').getAttribute('bitmask') * 1);
	                }
	            }
	            if (document.getElementById('SCDhprd')){
	                if (document.getElementById('SCDhprd').checked){
	                	ncbi_extrafeat += (document.getElementById('SCDhprd').getAttribute('bitmask') * 1);
	                }
	            }
	            if (ncbi_extrafeat > 0) extrafeat = ncbi_extrafeat;
            }
            */
            
            // sequence display
            if (document.getElementById('SCDshowseq')) {            	
	             if (document.getElementById('SCDshowseq').checked) {
	             	custom_view.push("withparts=on");
	             } else {
	            	custom_view.push("hide-sequence=on");
	                //fmt_mask += 32768; // hide sequence 
	                //fmt_mask += 262144 // suppress CDS /translation notes 
	            }
            }
            
            
            if (document.getElementById('SCDcdd') && document.getElementById('SCDcdd').checked){
            	custom_view.push("show-cdd=on");
            } else {
            	custom_view.push("hide-cdd=on");
            }
            
            if (document.getElementById('SCDsnp') && document.getElementById('SCDsnp').checked){
            	custom_view.push("show-vdb-snp=on");
            }
            
            if (document.getElementById('SCDshowgap') && document.getElementById('SCDshowgap').checked){
            	custom_view.push("show-gaps=on&feat-depth=1");
            }
            
            
            if (document.getElementById('SCDstrand') && document.getElementById('SCDstrand').checked){
                 strand = 'on';
            }
            
            //master
            if (document.getElementById('SCDshowmaster')){
                master = 'false';
            }
            
            // add url input of fmt_mask
            //fmt_mask |= url_fmt_mask ;
            
        } // if not master view selected
        
        Portal.Portlet.Sequence_ViewerCustomizer.custom_view = custom_view;
	    // send message
        this.send.Bitmask({
//            'fmt_mask': fmt_mask,
            'extrafeat': extrafeat,
            'strand': strand,
//            'maxplex': maxplex,
            'master': master,
            custom_view:custom_view
            //'url_fmt_mask': url_fmt_mask
        });
        
	}, // end SendData()
	
	AdvisoryMessages: function(pagestatus){
	    this.SequenceHiddenMsg(pagestatus);
	},
	
	SequenceHiddenMsg: function(pagestatus){
	    // if 'show sequence' option exists on the page and this is not a contig sequence (seq that has master view) 
	    if (document.getElementById('SCDshowseq') && !document.getElementById('SCDshowmaster')){
	        // if this is the initial page load and show sequence option is unchecked
	        if (pagestatus == 'pageinit' && !document.getElementById('SCDshowseq').checked){
    	        // send message
                this.send.AdvisoryMessage({
                    'type': 'HiddenSequence',
                    'action': 'add',
                    'text': "Sequence not displayed. Use 'Customize View' section for control."
                });
            }
            else if (pagestatus == 'pageupdate'){
                // send message
                this.send.AdvisoryMessage({
                    'type': 'HiddenSequence',
                    'action': 'remove',
                    'text': ''
                });
            }
	    }
	},
	
    receive: function(responseObject, userArgs) {
    },
    
    beforesubmit: function (){
    	/*
        if(this.getInput("FmtMask") && this.getValue("FmtMask") != ''){
            var newFmtMask = this.getValue("FmtMask") * 1;
            if (document.getElementById('SCDshowsel') && document.getElementById('SCDshowsel').checked){
                newFmtMask |= (128 + 32 + 8 + 256);
            }
            if (document.getElementById('SCDshowseq') && !document.getElementById('SCDshowseq').checked){
                newFmtMask |= 32768;
            }
            this.setValue("FmtMask", newFmtMask);
        }
        */
        return false;
    }
},
{
    UserTouchedShowSequence: false,
    UserChangedShowSequence: false,
    elWarningMessage: document.getElementById("id-ID-1580"),
    custom_view:[]
}    
);
;
Portal.Portlet.LinkListPageSection = Portal.Portlet.NCBIPageSection.extend ({
	init: function (path, name, notifier){
		this.base (path, name, notifier);
	},
	
	"getPortletPath" : function(){
	    return (this.realname + ".NCBIPageSection");
	}
});
;
(function( $ ){ // pass in $ to self exec anon fn
    // on page ready
    $( function() {
        $('li.brieflinkpopper').each( function(){
            var $this = $( this );
            var popper = $this.find('a.brieflinkpopperctrl') ;
            var popnode = $this.find('div.brieflinkpop');
            var popid = popnode.attr('id') || $.ui.jig._generateId('brieflinkpop');
            popnode.attr('id', popid);
            popper.ncbipopper({
                destSelector: "#" + popid,
                destPosition: 'top right', 
                triggerPosition: 'middle left', 
                hasArrow: true, 
                arrowDirection: 'right',
                isTriggerElementCloseClick: false,
                adjustFit: 'none',
                openAnimation: 'none',
                closeAnimation: 'none',
                delayTimeout : 130
            });
        }); // end each loop  
    });// end on page ready
})( jQuery );

Portal.Portlet.BriefLinkPageSection = Portal.Portlet.LinkListPageSection.extend({

	init: function(path, name, notifier) {
	    console.info("Created BriefLinkPageSection");
		this.base(path, name, notifier);
	},
	
	"getPortletPath" : function(){
	    return (this.realname + ".LinkListPageSection.NCBIPageSection");
	}
	
});
;
Portal.Portlet.Sequence_ToolsList = Portal.Portlet.BriefLinkPageSection.extend({
    
    init: function(path, name, notifier) {
        console.info("Created Sequence_ToolsList");
		this.base(path, name, notifier);
	},
	
	/*SetPortletName: function(){
	    Portal.Portlet.BriefLinkPageSection.portletname = 'Sequence_ToolsList';
	},*/
	
	'getPortletPath': function(){
        return this.realname + ".BriefLinkPageSection.LinkListPageSection.NCBIPageSection";
    },
    
    send: {		
		'SendSavedUidList': null,
		'SendSavedAccnList': null
	},
	
	listen: {
    	'SelectedRegion' : function(sMessage, oData, sSrc) {    	
    	    var to = '';
	        var from = '';
	        var itemid = '';
    	    
    	    if (oData) {
        	    from = oData.from;
        	    to = oData.to;
        	    itemid = oData.itemid;
            }           
            //alert(from+" "+to+" "+itemid);
            // get the BLAST link, w/o id has to go w/ the awkward way            
            var links = cssQuery("div.brieflink div.Sequence_ToolsList ul li.brieflinkpopper");
            
            var blast = links[0].getElementsByTagName('a')[0];
            var primers = links[1].getElementsByTagName('a')[0];
            
            //alert(blast.innerHTML);
            //if (blast.innerHTML == 'Run BLAST') {
            if (blast.innerHTML.indexOf('BLAST') > 0) {
                var url = blast.getAttribute('href') ;
                var cutoff = url.indexOf('PAGE_TYPE=BlastSearch');
                url = url.substring(0, cutoff) + 'PAGE_TYPE=BlastSearch'; // remove itemid/from/to if already exists
                //alert(url);
                if (itemid != '') {                    
                    url = url + '&itemid=' + itemid;
                }
                else if (from != '') {                 
                    url = url + '&QUERY_FROM=' + from;
                    if (to != '') {
                        url = url + '&QUERY_TO=' + to;
                    }                 
                } 
                else if (to != '') {
                    url = url + '&QUERY_FROM=1';
                    url = url + '&QUERY_TO=' + to;
                }
                
                blast.setAttribute('href', url);
            
            }
            
            
            
            //alert(primers.innerHTML);
            //if (primers.innerHTML == 'Pick Primers') {
            if (primers.innerHTML.indexOf('Primers') > 0) {
                var url = primers.getAttribute('href') ;
                var cutoff = url.search(/&PRIMER\d_/);                
                if (cutoff != -1)
                    url = url.substring(0, cutoff);  // remove itemid/from/to if already exists
                //alert(url);
                /*if (itemid != '') {                    
                    url = url + '&itemid=' + itemid;
                }
                else*/ 
                if (from != '') {
                    url = url + '&PRIMER5_START=' + from;
                    if (to != '') {
                        url = url + '&PRIMER3_END=' + to;
                    }
                }
                else if (to != '') {
                        url = url + '&PRIMER5_START=1';
                        url = url + '&PRIMER3_END=' + to;
                }
                
                primers.setAttribute('href', url);
            }
            
    	 },  	 
    	 
    	 'ToolsLinkClick' : function (sMessage, oData, sSrc) {
    	    Portal.Portlet.Sequence_ToolsList.ToolsDefaultUrl = oData.url;
    	    // wait for idList before proceeding
            Portal.Portlet.Sequence_ToolsList.WaitingForIdList = true;
            //this.send.SendSavedUidList();   
            this.send.SendSavedAccnList({'src': 'adtools'}); // seq result controller listens to this
    	 },    	 
    	 
    	 
    	 'SavedUidList' : function(sMessage, oData, sSrc) {
    	     this.UpdateToolUrlIds(oData);       
    	 },
    	 
    	 'SavedAccnList' : function(sMessage, oData, sSrc) {// seq result controller sends this
    	     if(oData.src === 'adtools')
    	     {
    	         console.log('for ad tools');
    	         console.log(oData);
    	         this.UpdateToolUrlIds(oData);
    	     }
    	 }
    	 
	},
	
	'UpdateToolUrlIds' : function(oData) { //works w/ any kind ids (e.g. uid, accn)	    
        if (Portal.Portlet.Sequence_ToolsList.WaitingForIdList){
            Portal.Portlet.Sequence_ToolsList.WaitingForIdList = false; 
            
            //get idlist
            var idList = oData.idlist || '';
            
            var newUrl = Portal.Portlet.Sequence_ToolsList.ToolsDefaultUrl;
                        
            //var param = (newUrl.indexOf('QUERY=') > 0) ? 'QUERY=' : 'seqsToAlignFastA=';
            if(newUrl.indexOf('QUERY=') > 0)
                param = 'QUERY=';
            else if(newUrl.indexOf('queries=') > 0)
                param = 'queries=';
            else
                param = 'seqsToAlignFastA=';
            
            
            if (idList != '') {
                var cutoff = newUrl.indexOf(param);                
                newUrl = newUrl.substring(0, cutoff) + param + idList;                 
            } 
            if ((param == 'QUERY=')||(param == 'queries=')) { //blast and CDSearch need uids in separate lines
            	newUrl = newUrl.replace(/,/g, '%0D');
            }                    
            //alert (newUrl);
            window.location = newUrl;
         }
    } 
},

	{        
        WaitingForIdList: false,
        ToolsDefaultUrl: ''
    }
);
;
Portal.Portlet.DiscoveryDbLinks = Portal.Portlet.BriefLinkPageSection.extend({
    
    init: function(path, name, notifier) {
		this.base(path, name, notifier);
	},
	
	"getPortletPath" : function(){
	    return (this.realname + ".BriefLinkPageSection.LinkListPageSection.NCBIPageSection");
	}
});
;
Portal.Portlet.Sequence_DiscoveryDbLinks = Portal.Portlet.DiscoveryDbLinks.extend({
    
    init: function(path, name, notifier) {
		this.base(path, name, notifier);
	},
	
	'getPortletPath': function(){
        return this.realname + ".DiscoveryDbLinks.BriefLinkPageSection.LinkListPageSection.NCBIPageSection";
    }
});
;
Portal.Portlet.LinkOutPortlet = Portal.Portlet.BriefLinkPageSection.extend({
    
    init: function(path, name, notifier) {
		this.base(path, name, notifier);
	},
	
	'getPortletPath': function(){
        return this.realname + ".BriefLinkPageSection.LinkListPageSection.NCBIPageSection";
    }
});


;
(function( $ ){ // pass in $ to self exec anon fn
    // on page ready
    $( function() {
        $('li.ralinkpopper').each( function(){
            var $this = $( this );
            var popper = $this;
            var popnode = $this.find('div.ralinkpop');
            var popid = popnode.attr('id') || $.ui.jig._generateId('ralinkpop');
            popnode.attr('id', popid);
            popper.ncbipopper({
                destSelector: "#" + popid,
                destPosition: 'top right', 
                triggerPosition: 'middle left', 
                hasArrow: true, 
                arrowDirection: 'right',
                isTriggerElementCloseClick: false,
                adjustFit: 'none',
                openAnimation: 'none',
                closeAnimation: 'none',
                delayTimeout : 130
            });
        }); // end each loop  
    });// end on page ready
})( jQuery );

Portal.Portlet.HistoryDisplay = Portal.Portlet.NCBIPageSection.extend({

	init: function(path, name, notifier) {
		console.info("Created History Ad...");
		this.base(path, name, notifier);    
	},
	
	send: {
      'Cmd': null      
    },   
    
    receive: function(responseObject, userArgs) {  
         var cmd = userArgs.cmd;
         var rootNode = document.getElementById('HTDisplay'); 
         var ul = document.getElementById('activity');
         var resp = responseObject.responseText;
             
         if (cmd == 'HTOn') { 
            rootNode.className = '';    // hide all msg and the turnOn link
            try {
            //alert(resp);
                // Handle timeouts
                if (responseObject.status == 408) { 
                    rootNode.className = 'HTOn'; // so that the following msg will show up
                    rootNode.innerHTML = "<p class='HTOn'>Your browsing activity is temporarily unavailable.</p>";
                    return;
                }
                   
                 // Looks like we got something...
                 resp = '(' + resp + ')';
                 var JSONobj = eval(resp);
                 
                 // Build new content (ul)
                 var newHTML = JSONobj.Activity;
                 var newContent = document.createElement('div');
                 newContent.innerHTML = newHTML;
                 var newUL = newContent.getElementsByTagName('ul')[0];
                 //alert(newHTML);
                 //alert(newContent.innerHTML);
                 //alert(newUL.innerHTML);
                 // Update content
                 rootNode.replaceChild(newUL, ul);
                 //XHR returns no activity (empty ul), e.g. activity cleared
                 if (newUL.className == 'hide')                     
                     rootNode.className = 'HTOn';  // show "Your browsing activity is empty." message
                 
            }         
            catch (e) {
                //alert('error');
                rootNode.className = 'HTOn'; // so that the following msg will show up
                rootNode.innerHTML = "<p class='HTOn'>Your browsing activity is temporarily unavailable.</p>";
           }
         }
         else if (cmd == 'HTOff') {                         
             if (ul != null) { 
                 ul.className='hide'; 
                 ul.innerHTML = ''; // clear activity
             }
             rootNode.className = 'HTOff';    // make "Activity recording is turned off." and the turnOn link show up             
         }
         else if (cmd == 'ClearHT') { 
             var goAhead = confirm('Are you sure you want to delete all your saved Recent Activity?');
             if (goAhead == true) { 
                 if ( rootNode.className == '') { //                 
                     rootNode.className = 'HTOn';  // show "Your browsing activity is empty." message                                  
                     if (ul != null) {
                         ul.className='hide'; 
                         ul.innerHTML = '';
                     }
                 }
             }
         } 
         
    },
    
	listen: {
	  'Cmd' : function(sMessage, oData, sSrc){
			console.info("Inside Cmd in HistoryDisplay: " + oData.cmd);
			this.setValue("Cmd", oData.cmd);
	  },	  
		
      "HistoryToggle<click>" : function(e, target, name){
         //alert(target.getAttribute("cmd"));
         this.send.Cmd({'cmd': target.getAttribute("cmd")});         
         console.info("Inside HistoryToggle in HistoryDisplay: " + target.getAttribute("cmd"));
         
         //var site = document.forms[0]['p$st'].value;
         var cmd =  target.getAttribute("cmd");     
               
         // Issue asynchronous call to XHR service, callback is to update the portlet output            
         this.doRemoteAction(target.getAttribute("cmd"));                      
      }, 
      
      "HistoryOn<click>" : function(e, target, name){
         this.send.Cmd({'cmd': target.getAttribute("cmd")});
         //$PN('Pubmed_ResultsSearchController').getInput('RecordingHistory').value = 'yes';		 
         console.info("Inside HistoryOn in HistoryDisplay: " + target.getAttribute("cmd"));
         this.doRemoteAction(target.getAttribute("cmd"));         
      },
      
      "ClearHistory<click>" : function(e, target, name){
         this.send.Cmd({'cmd': target.getAttribute("cmd")});
         this.doRemoteAction(target.getAttribute("cmd"));         
      }
    },
    
    'getPortletPath': function(){
        return this.realname + ".NCBIPageSection";
    }, 
    
    'doRemoteAction': function(command) {
         var site = document.forms[0]['p$st'].value;          
	     var resp = xmlHttpCall(site, this.realname, command, {}, this.receive, {'cmd': command}, this);
    }
});

;
// --------------------- Common code BEGIN ---------------------

/*
*************************************************************************
* 
* Attention: 
* '.replace("_", "-")' and '.replace("-", "_")' added because markup is using accession, not gi
* 
*************************************************************************
*/
function Seq_Search() {
    this.NAME = "Seq_Search";
    this.EmptyText = "Sub-sequence or pattern";
    this.SearchTerm = this.EmptyText;
    this.Limit = 1000;
    this.Type = "";

    this.aAcc = {};
    this.aGi = [];
}

Seq_Search.prototype = new Seq_Search_Base();

/*
*************************************************************************
*************************************************************************
*/
Seq_Search.prototype.Run = function(oGlobalNotifier) {
    var oThis = this;
    this.constructor.prototype.Run.call(this, oGlobalNotifier);
    //   this.oGlobalNotifier = oGlobalNotifier;

    var oProvider = new RemoteDataProvider("/projects/sviewer/sv_search.cgi?");
    oProvider.bAsync = false;
    oProvider.onError = function(oObj) { }
    oProvider.onSuccess = function(oObj) {
    	function x_makeAcc(seqId) {
        	var a = seqId.split("|"); //"ref|NC_037354.1|" or pdb|2B0E|D
        	if (a.length !== 3) {
        		console.info("Error in sv_search.cgi output: wrong seqId structure: seqId=", seqId);
        		return;
        	}
        	if (a[0] === "pdb") return a[1] + "_" + a[2];
        	else return a[1];
    	}
        var oData = {};
        try { eval("oData = " + oObj.responseText) } catch (e) { return; }

        var st = oData.job_status;
        if (st == 'submitted' || st == 'running' || st == 'pending') {
            setTimeout(function() {
                oProvider.Get("obj_key=" + oData.job_id);
                }, 2000);
            return;
        }

        // create array with id that have been found
        var oObj = [];
        var iOffset = oThis.Ids.length;
        var n = 0;
        var b = oThis.From > 0 && oThis.Strand == "+";
        for (var i = 0; i < oData.features.length; i++) {
            var x = oData.features[i];
            if (b) {
                x.from -= oThis.From - 1;
                x.to -= oThis.From - 1;
            }
            // fasta markup does not contains Gi anymore. Use accession instead
            var x_acc =  x_makeAcc(x.seqId);
            if (!x_acc) return; // error occurred
            var y = { gi: x_acc, id: x_acc + "_" + x.from + "_" + x.to + "_" + n++, from: x.from, to: x.to, total: oData.total };
            oObj.push(y);
            oThis.Ids.push(y.id);
        }
        //console.info("form sv_search oData=", oData);
        if (oData.total == 0 && iOffset == 0) {
            oThis.oNotifier.Notify(this, oThis.oNotifier.NotFound);
        } else if (oData.features[0]) {
        	var sGi = x_makeAcc(oData.features[0].seqId);
        	if (!sGi) return; // error occurred
            //console.info("form sv_search sGi=", sGi);
            oThis.Totals[sGi] = oData.total;
            //oThis.Acc[sGi] = oThis.aAcc[x.gi]; // no gi anymore
            //oThis.Acc[sGi] = sGi;
            oThis.Offset[sGi] = iOffset;
            oThis.oNotifier.Notify(this, oThis.oNotifier.DataIsReady, oObj);
        }
    }


    // ----------------------------------------------------------------------------------------
    oThis.oNotifier.setListener(this, oThis.oNotifier.Search, function(x) {
        // get array GIs on the pages
        // console.info("Seq_Search:oThis.oNotifier.Search", oThis.aGi);
        if (oThis.SearchTerm == "" || oThis.SearchTerm == oThis.EmptyText) return true;
        if (!oThis.Init()) return true;
        oThis.oNotifier.Notify(this, oThis.oNotifier.Clear);

        for (var i = 0; i < oThis.aGi.length; i++) {
            var sUrl = "term=" + encodeURI(oThis.SearchTerm) + "&id=" + oThis.aGi[i].replace("-", "_")
            + (oThis.From > 0 ? "&from=" + (oThis.From - 1) : "")
            + (oThis.To > 0 ? "&to=" + (oThis.To - 1) : "")
            + "&strand=" + (oThis.Strand == "+" ? "plus" : "minus")
            + "&limit=" + oThis.Limit
            + "&type=" + oThis.Type
            + (oThis.From > 0 || oThis.To > 0 ? "" : "&whole=1")
            + "&coord=" + (oThis.Strand == "+" ? "strand" : "weird");
            oProvider.Get(sUrl);
        }
    });



    // ----------------------------------------------------------------------------------------
    new Seq_SearchHighligt(this);
    var elSearchBar = document.getElementById("seq_search_bar");
    if (elSearchBar) {
        var x = new Seq_SearchBar();
        x.Run(this, elSearchBar);
    }

    var s = utils.getParams(document.location.href)["search"];
    if (s) {
        var a = s.split("#");
        s = a[0];   // eliminate cases like http:/www...?a=1&search=ata#
        if (s) {
            this.SearchTerm = s;
            this.oNotifier.Notify(this, this.oNotifier.ShowSearchBar);
            this.Search();
        }
    }
}


/*
*************************************************************************
*************************************************************************
*/
function Seq_SearchBar() {
    this.NAME = "Seq_SearchBar";
    var oThis = this;
}

Seq_SearchBar.prototype = new Seq_SearchBar_Base;
    
/*
*************************************************************************
*************************************************************************
*/
Seq_SearchBar.prototype.Run = function(SeqSearchData, elSearchBar) {
    var oThis = this;

    var elText = document.getElementById("seq_search_bar_text");
    var elNavCtrls = document.getElementById("seq_nav_control");
    var elFind = document.getElementById("seq_search_bar_find");
    var elNext = document.getElementById("seq_search_bar_next");
    var elPrevious = document.getElementById("seq_search_bar_previous");
    var elFirst = document.getElementById("seq_search_bar_first");
    var elLast = document.getElementById("seq_search_bar_last");
    var elClear = document.getElementById("seq_search_bar_clear");
    var elHide = document.getElementById("seq_search_bar_hide");
    var elRange = document.getElementById("seq_search_bar_total");
    var elMessage = document.getElementById("seq_search_bar_message");
    var elWarning = document.getElementById("seq_search_bar_warning");
    var elHandler = document.getElementById("seq_search_handler");

    this.constructor.prototype.Run.call(this, SeqSearchData, elSearchBar);
    this.constructor.prototype.SetListeners.call(this);


    // Listener started =======================================================================

    // ----------------------------------------------------------------------------------------
    this.oNotifier.setListener(this, this.oNotifier.ShowSearchBar, function(x) {
//    	console.info("elSearchBar=", elSearchBar);
        elSearchBar.style.display = "block";
        oThis.Transition(elSearchBar);
        utils.addClass(document.body, "with-searchbar");
        elText.value = oThis.SeqSearchData.SearchTerm;
        if (oThis.SeqSearchData.SearchTerm != oThis.SeqSearchData.EmptyText && oThis.SeqSearchData.SearchTerm != "") {
            utils.removeClass(elText, "empty");
            elText.focus();
        } else {
            x_TextReset();
        }
        x_Reset();
    });

    //-----------------------------------------------------------------------------------------
    this.oNotifier.setListener(this, this.oNotifier.DataIsReady, function(x, SeqSearchData) {
        if (SeqSearchData) {
            elMessage.innerHTML = "";
            utils.removeClass(elNavCtrls, "hide");
            x_ShowRange();
            oThis.oNotifier.Notify(this, oThis.oNotifier.First);
            if (oThis.SeqSearchData.Ids.length <= 1) {
                oThis.oNotifier.Notify(this, oThis.oNotifier.Last);
            }
        }
    });

    //-----------------------------------------------------------------------------------------
    this.oNotifier.setListener(this, this.oNotifier.Next, function() {
        //        console.info("show prev");
        x_ShowRange();
        if (oThis.SeqSearchData.Ids.length > 1) {
            utils.removeClass(elPrevious, "disabled");
            utils.removeClass(elFirst, "disabled");
        }
        if (oThis.SeqSearchData.Current >= oThis.SeqSearchData.Ids.length - 1) {
            utils.addClass(elNext, "disabled");
            utils.addClass(elLast, "disabled");
        }
    });

    //-----------------------------------------------------------------------------------------
    this.oNotifier.setListener(this, this.oNotifier.Previous, function() {
        //        console.info("show prev, oThis.SeqSearchData.Current=", oThis.SeqSearchData.Current);
        x_ShowRange();
        if (oThis.SeqSearchData.Ids.length > 1) {
            utils.removeClass(elNext, "disabled");
            utils.removeClass(elLast, "disabled");
        }
        if (oThis.SeqSearchData.Current < 1) {
            utils.addClass(elPrevious, "disabled");
            utils.addClass(elFirst, "disabled");
        }
    });
    //-----------------------------------------------------------------------------------------
    this.oNotifier.setListener(this, this.oNotifier.NotFound, function() {
        utils.addClass(elNavCtrls, "hide");
        elRange.innerHTML = "";
        elMessage.innerHTML = "No matches found";
    });

    //-----------------------------------------------------------------------------------------
    this.oNotifier.setListener(this, this.oNotifier.Reset, function() {
        x_Reset();
    });

    // Listeners ended =========================================================================

    // Events started ==========================================================================
    //-----------------------------------------------------------------------------------------
    if (elHandler) elHandler.onclick = function(e) {
        e = e || event;
        utils.preventDefault(e);
        oThis.oNotifier.Notify(this, oThis.oNotifier.Clear);
        oThis.SeqSearchData.oGlobalNotifier.Notify(this, oThis.SeqSearchData.oGlobalNotifier.HideSearchBar);
        oThis.oNotifier.Notify(this, oThis.oNotifier.ShowSearchBar);
    };
    //-----------------------------------------------------------------------------------------
    elNext.onclick = function(e) {
        e = e || event;
        utils.preventDefault(e);
        oThis.oNotifier.Notify(this, oThis.oNotifier.Next);
    };

    //-----------------------------------------------------------------------------------------
    elPrevious.onclick = function(e) {
        e = e || event;
        utils.preventDefault(e);
        oThis.oNotifier.Notify(this, oThis.oNotifier.Previous);
    };

    //-----------------------------------------------------------------------------------------
    elFirst.onclick = function(e) {
        e = e || event;
        utils.preventDefault(e);
        oThis.oNotifier.Notify(this, oThis.oNotifier.First);
    };

    //-----------------------------------------------------------------------------------------
    elLast.onclick = function(e) {
        e = e || event;
        utils.preventDefault(e);
        oThis.oNotifier.Notify(this, oThis.oNotifier.Last);
    };

    //-----------------------------------------------------------------------------------------
    elHide.onclick = function(e) {
        e = e || event;
        utils.preventDefault(e);
        oThis.SeqSearchData.oGlobalNotifier.Notify(this, oThis.SeqSearchData.oGlobalNotifier.HideSearchBar);
    };

    //-----------------------------------------------------------------------------------------
    utils.addEvent(elText, "keyup", function(e) {
        e = e || window.event;
        if (elText.value == "") {
            x_TextReset();
        }

    });
    //-----------------------------------------------------------------------------------------
    utils.addEvent(elText, "keydown", function(e) {
        e = e || window.event;
        if (elText.value == oThis.SeqSearchData.EmptyText) {
            elText.value = "";
            utils.removeClass(elText, "empty");
        }

    });
    //-----------------------------------------------------------------------------------------
    utils.addEvent(elText, "keypress", function(e) {
        e = e || window.event;
        var c = e.keyCode || e.which;
        if (utils.KeyCode_ENTER == c) {
            x_Search();
            return false;
        }
    });

    //-----------------------------------------------------------------------------------------
    elFind.onclick = function(e) {
        e = e || event;
        utils.preventDefault(e);
        x_Search();
    };

    //-----------------------------------------------------------------------------------------
    elClear.onclick = function(e) {
        e = e || event;
        utils.preventDefault(e);
        x_TextReset();
        x_Reset();
        oThis.oNotifier.Notify(this, oThis.oNotifier.Clear);
    };

    // Events ended ===========================================================================
    //-----------------------------------------------------------------------------------------
    function x_Search() {
            x_Reset();
            x_GetTerm();
            oThis.oNotifier.Notify(this, oThis.oNotifier.Search);

/*
        if (oThis.SeqSearchData.CheckIfAllSequencesAreLoaded()) {
            x_Reset();
            x_GetTerm();
            oThis.oNotifier.Notify(this, oThis.oNotifier.Search);
        } else {
            elWarning.innerHTML = "<span class='warning'>Warning: Waiting will pages will loaded totally...</span>";
            utils.addClass(elSearchBar, "with-warning");
            setTimeout(function() { x_Search(); }, 2000);
        }
        */
    }


    //-----------------------------------------------------------------------------------------
    function x_Reset() {
        //        elMessage.innerHTML = "";
        //        elWarning.innerHTML = "";
        utils.removeChildren(elMessage);
        utils.removeChildren(elWarning);
        utils.addClass(elNavCtrls, "hide");
        utils.removeClass(elSearchBar, "with-warning");
        oThis.SeqSearchData.SearchTerm = "";
    }

    //-----------------------------------------------------------------------------------------
    function x_TextReset() {
        elText.value = oThis.SeqSearchData.EmptyText;
        utils.addClass(elText, "empty");
        utils.selectRange(elText, 0, 0)
        elText.focus();
    }

    //-----------------------------------------------------------------------------------------
    function x_GetTerm() {
        var s = elText.value;
        if (s == "" || s == oThis.SeqSearchData.EmptyText) return s;
        oThis.SeqSearchData.SearchTerm = s.split(" ").join("");
    }

    //-----------------------------------------------------------------------------------------
    function x_ShowRange() {
        var a = oThis.SeqSearchData.Ids[oThis.SeqSearchData.Current].split("_");
        if (a.length < 4) return "error";
        var sGi = a[0];
        if (a.length === 5) sGi += "_" + a[1];
        //console.info("x_ShowRange sGi=", sGi);
        //console.info("oThis.SeqSearchData=", oThis.SeqSearchData);
        var iTotal;
        if (oThis.SeqSearchData.Totals[sGi] > oThis.SeqSearchData.Limit) {
            elWarning.innerHTML = "<span class='warning'>Warning: " + oThis.SeqSearchData.Totals[sGi]
            + " matches were found for " + sGi + ", only first " + (oThis.SeqSearchData.Ids.length - oThis.SeqSearchData.Offset[sGi]) + " are shown</span>";
            utils.addClass(elSearchBar, "with-warning");
            iTotal = oThis.SeqSearchData.Limit;
        } else {
            elWarning.innerHTML = "";
            utils.removeClass(elSearchBar, "with-warning");
            iTotal = oThis.SeqSearchData.Totals[sGi];
        }
        elMessage.innerHTML = sGi + " : " + (1 + parseInt(a[2])) + "-" + (1 + parseInt(a[3]));
        //        elRange.innerHTML = (oThis.SeqSearchData.Current + 1 - oThis.SeqSearchData.Offset[sGi]) 
        //            + "(" + (oThis.SeqSearchData.Current + 1) + ")"
        //            + " of " + iTotal 
        //            + "(" + oThis.SeqSearchData.Ids.length + ")";
        elRange.innerHTML = (oThis.SeqSearchData.Current + 1) + " of " + oThis.SeqSearchData.Ids.length;
    }
}

/*
*************************************************************************
*************************************************************************
*/
function Seq_SearchHighligt(SeqSearchData) {
    this.NAME = "Seq_SearchHighligt";
    var oThis = this;
    oThis.SeqSearchData = SeqSearchData;
    var oNotifier = this.SeqSearchData.oNotifier;
    
    var Cache = [];
    var iLineLength = 60;
    var bIsFasta = false;

    //-----------------------------------------------------------------------------------------
    oNotifier.setListener(this, oNotifier.Reset, function(x, SeqSearchData) {
         Cache = [];
     });   
   
    //-----------------------------------------------------------------------------------------
    oNotifier.setListener(this, oNotifier.Clear, function(x, bSkipRestore) {
        // clear previous search result
        if (!bSkipRestore) {
            // 'from', 'to' may be changed
            for(var i = 0; i < Cache.length; i++) {
                var el = document.getElementById(Cache[i].id);
                el.innerHTML = Cache[i].text;
            }
        }
        Cache = [];
     });   

    //-----------------------------------------------------------------------------------------
    oNotifier.setListener(this, oNotifier.DataIsReady, function(x, oData) {
        // build a visual presentation of search result
        if (!oData[0]) return;
        
        // wait till markuped sequence data will be ready up to iMax times
        var iMax = 5;
        x_checkData(oData);
    
        //-------------------------------------------------------------------------------------
        function x_checkData(oData) {
            var x = oData[0];
            if (document.getElementById(x_getLineId(x.gi, 1))) {
                x_Highlight(oData);
            } else if (!document.getElementById(x_getLineId(x.gi, 1)) && iMax--) {
                setTimeout(function() { x_checkData(oData); }, 100);
            }
        }

        //-----------------------------------------------------------------------------------------
        function x_Highlight(oData) {
            var sLineId, sLineText, sLineUpdated, s1, s2, s3, prev_stop;
            
            sLineId = "";
            sLineUpdated = "";
            prev_stop = 0;
            s3 = 0;
           
            // init once
            if (oData && oData[0]) {
                var x = oData[0];
                // check if a line came from FASTA or Genbank report
                x_StartProcessNewLine(x_getLineId(x.gi, x_getOrigin(1)));
                bIsFasta = sLineText.indexOf(" ") == -1;
                if (bIsFasta) iLineLength = 70;
            } else return;
            
            for (var i = 0; i < oData.length; i++) {
                //  start processing new pattern that has been found
                var x = oData[i];
                if (oThis.SeqSearchData.CurrentId == "") oThis.SeqSearchData.CurrentId = x.id;
                
                var sLineId_New = x_getLineId(x.gi, x_getOrigin(x.from));
//                console.info("New pattern: sLineId_New=", sLineId_New, ", sLineId=", sLineId);
                if (sLineId && sLineId_New != sLineId) {
//                    console.info("    +++ Dump line sLineId=" , sLineId);
                    elLine.innerHTML = sLineUpdated + s3;
                    sLineUpdated = "";
                    prev_stop = 0;
                }
                
                var iLineBegin = x_getOrigin(x.from);
                var iLineEnd = x_getOrigin(x.to);

                // process all lines wich contain the pattern
                var j = 0;
                for (var n = iLineBegin; n <= iLineEnd + 1; n += iLineLength, j++) {
                    // process all lines for current patterm
                    if (j > 0) {
                        elLine.innerHTML = sLineUpdated + s3;
                        prev_stop = 0;
                        sLineUpdated = "";
                    } 
                    var sLineId = x_getLineId(x.gi, n);
                    x_StartProcessNewLine(sLineId);
//                    console.info("    sLineId=", sLineId, ", sLineText=", sLineText);

                    start = x.from - n + 1;
                    stop = x.to - n + 1;
                    if (!bIsFasta) {
                        start = start + Math.floor(start/10);
                        stop = stop + Math.floor(stop/10);
                    }
                    
                    s1 = sLineText.substring(prev_stop, start);
                    s2 = sLineText.substring(start, stop + 1);
                    s3 = sLineText.substring(stop + 1, sLineText.length);
//                    console.info("    s1=", s1, ", s2=", s2, ", s3=",  s3, ", prev_stop=", prev_stop);

                    x_GetUpdatedLine();
//                    console.info("    sLineUpdated=", sLineUpdated);
                    prev_stop = stop + 1;
                }
            }
            
            if (sLineUpdated) {
//                console.info("    +++ Dump LAST line sLineId=" , sLineId);
                elLine.innerHTML = sLineUpdated + s3;
                sLineUpdated = "";
            }

            //-----------------------------------------------------------------------------------------
            function x_StartProcessNewLine(sId) {
                elLine = document.getElementById(sId);
                sLineText = utils.getTextContent(elLine);
                if (typeof(sLineText) != "string") sLineText = elLine.innerText;
                Cache.push({id:sId, text:sLineText});
            }
            
            //-----------------------------------------------------------------------------------------
            function x_GetUpdatedLine() {
                var sId = x.id;
                var sClass = "";
                
                if (j != 0) sId += "_" + j;
                
                if (oThis.SeqSearchData.CurrentId == x.id) {
                    sClass = " class='current' ";
                    setTimeout(function() {
                        oNotifier.Notify(this, oNotifier.ScrollTo, oThis.SeqSearchData.CurrentId);
                    }, 1000);
                }
                
                sLineUpdated += s1 + "<b id='" + sId + "'" + sClass + ">" + s2 + "</b>";
            }
        }        
        //-----------------------------------------------------------------------------------------
        function x_getOrigin(i) {
            return Math.floor(i / iLineLength) * iLineLength + 1;
        }
     
        function x_getLineId(gi, from) {
            return gi + "_" + x_getOrigin(from);
        }
        
    });

    //-----------------------------------------------------------------------------------------
    oNotifier.setListener(this, oNotifier.Next, function() {
        if (oThis.SeqSearchData.Current < oThis.SeqSearchData.Ids.length - 1) {
            var elOld = document.getElementById(oThis.SeqSearchData.Ids[oThis.SeqSearchData.Current++]);
            var elNew = document.getElementById(oThis.SeqSearchData.Ids[oThis.SeqSearchData.Current]);
            x_MarkupCurrent(elOld, elNew);
        } else 
            return ;
    });

    //-----------------------------------------------------------------------------------------
    oNotifier.setListener(this, oNotifier.Previous, function() {
        if (oThis.SeqSearchData.Current > 0) {
            var elOld = document.getElementById(oThis.SeqSearchData.Ids[oThis.SeqSearchData.Current--]);
            var elNew = document.getElementById(oThis.SeqSearchData.Ids[oThis.SeqSearchData.Current]);
            x_MarkupCurrent(elOld, elNew);
        } else 
            return ;
    });

    //-----------------------------------------------------------------------------------------
    oNotifier.setListener(this, oNotifier.First, function() {
        if (oThis.SeqSearchData.Current == 0) return;
        var elOld = document.getElementById(oThis.SeqSearchData.Ids[oThis.SeqSearchData.Current]);
        oThis.SeqSearchData.Current = 0
        var elNew = document.getElementById(oThis.SeqSearchData.Ids[oThis.SeqSearchData.Current]);
        x_MarkupCurrent(elOld, elNew);
    });

    //-----------------------------------------------------------------------------------------
    oNotifier.setListener(this, oNotifier.Last, function() {
        if (oThis.SeqSearchData.Current == oThis.SeqSearchData.Ids.length - 1) return;
        var elOld = document.getElementById(oThis.SeqSearchData.Ids[oThis.SeqSearchData.Current]);
        oThis.SeqSearchData.Current = oThis.SeqSearchData.Ids.length - 1;
        var elNew = document.getElementById(oThis.SeqSearchData.Ids[oThis.SeqSearchData.Current]);
        x_MarkupCurrent(elOld, elNew);
    });

    //-----------------------------------------------------------------------------------------
    function x_NextPrev(i) {
        var elOld = document.getElementById(oThis.SeqSearchData.Ids[oThis.SeqSearchData.Current + i]);
        var elNew = document.getElementById(oThis.SeqSearchData.Ids[oThis.SeqSearchData.Current]);
        x_MarkupCurrent(elOld, elNew);
    }
    
    //-----------------------------------------------------------------------------------------
    function x_MarkupCurrent(elOld, elNew) {
        if (elOld && elNew) {
            utils.removeClass(elOld, "current");
            var sId, el, n;
            n = 1;
            sId = elOld.id
            while(el = document.getElementById(sId + "_" + n++)) {
                utils.removeClass(el, "current");
            }
            utils.addClass(elNew, "current");
            oThis.SeqSearchData.CurrentId = elNew.id;
            n = 1;
            while(el = document.getElementById(oThis.SeqSearchData.CurrentId + "_" + n++)) {
                utils.addClass(el, "current");
            }
            oNotifier.Notify(this, oNotifier.ScrollTo, oThis.SeqSearchData.CurrentId)
        }
    }
}


;
Portal.Portlet.Sequence_SearchTool = Portal.Portlet.extend({
    
    init: function(path, name, notifier) {
		this.base(path, name, notifier);
	},
	
	listen: {
	    'SeqSearchClicked': function (sMessage, oDataX, sSrc) {
			if(oData) {
	        	/*
                *************************************************************************
                *************************************************************************
                */
                function Seq_SearchPortal() {}
                Seq_SearchPortal.prototype = new Seq_Search();
                Seq_SearchPortal.prototype.Init = function()
                {
                    var elSeqSearchDiv = document.getElementById("seq_search_bar");
                    
                    this.From = parseInt(0 + Portal.Portlet.Sequence_SearchTool.from);
                    this.To = parseInt(0 + Portal.Portlet.Sequence_SearchTool.to);
                    this.Strand = Portal.Portlet.Sequence_SearchTool.strand;
                    
                    if (elSeqSearchDiv.getAttribute("db") == "protein") {
                        this.Type = "protein";
                    } else {
                        this.Type = "nucleotide";
                    }
                    return true;
                }
                
                if (!Portal.Portlet.Sequence_SearchTool.oSeqSearchBar) {
                    Seq_Search.Limit = 500;
                    Portal.Portlet.Sequence_SearchTool.oSeqSearchBar = new Seq_SearchPortal();
                    for (var i = 0; i < oData.length; ++i) {
    				    Portal.Portlet.Sequence_SearchTool.oSeqSearchBar.aGi.push("" + oData[i].gi);
    				    Portal.Portlet.Sequence_SearchTool.oSeqSearchBar.aAcc[oData[i].gi] = oData[i].acc;
    				}
                    Portal.Portlet.Sequence_SearchTool.oSeqSearchBar.oData = oData;
                    Portal.Portlet.Sequence_SearchTool.oSeqSearchBar.Run(Notifier.getInstance());
                }
                if (Portal.Portlet.Sequence_SearchTool.oSeqSearchBar) {
                    Portal.Portlet.Sequence_SearchTool.oSeqSearchBar.oNotifier.Notify(this, Portal.Portlet.Sequence_SearchTool.oSeqSearchBar.oNotifier.Clear, true);
    		        Portal.Portlet.Sequence_SearchTool.oSeqSearchBar.oGlobalNotifier.Notify(this, Portal.Portlet.Sequence_SearchTool.oSeqSearchBar.oGlobalNotifier.HideSearchBar);
    		        Portal.Portlet.Sequence_SearchTool.oSeqSearchBar.oNotifier.Notify(this, Portal.Portlet.Sequence_SearchTool.oSeqSearchBar.oNotifier.ShowSearchBar);
		        }
	        }
	    },
	    
	    'SelectedRegion' : function(sMessage, oData, sSrc) {
	        Portal.Portlet.Sequence_SearchTool.from = oData.from;  
            Portal.Portlet.Sequence_SearchTool.to = oData.to;
            Notifier.getInstance().Notify(this, Seq_Search.Reset);
	    },
	    
	    'Bitmask' : function(sMessage, oData, sSrc) {
	        Portal.Portlet.Sequence_SearchTool.strand = (oData.strand == 'on' ? '-' : '+');
            Notifier.getInstance().Notify(this, Seq_Search.Reset);
	    }

	} //end listen	
},

{
    to: '',
    from: '',
    strand: '+',
    oSeqSearchBar:null
});




;
Portal.Portlet.DbConnector = Portal.Portlet.extend({

	init: function(path, name, notifier) {
		var oThis = this;
		console.info("Created DbConnector");
		this.base(path, name, notifier);
		
		// reset Db value to original value on page load. Since LastDb is the same value as Db on page load and LastDb is not changed on
		// the client, this value can be used to reset Db. This is a fix for back button use.
		if (this.getValue("Db") != this.getValue("LastDb")){
		    this.setValue("Db", this.getValue("LastDb"));
		}
     
		// the SelectedIdList and id count from previous iteration (use a different attribute from IdsFromResult to prevent back button issues)
		Portal.Portlet.DbConnector.originalIdList = this.getValue("LastIdsFromResult");
		console.info("originalIdList " + Portal.Portlet.DbConnector.originalIdList);
		// if there is an IdList from last iteration set the count
		if (Portal.Portlet.DbConnector.originalIdList != ''){
			Portal.Portlet.DbConnector.originalCount = Portal.Portlet.DbConnector.originalIdList.split(/,/).length;
		}

		notifier.setListener(this, 'HistoryCmd', 
        	function(oListener, custom_data, sMessage, oNotifierObj) {
           		var sbTabCmd = $N(oThis.path + '.TabCmd');
           		sbTabCmd[0].value = custom_data.tab;
        	}
    		, null);
    
	},

	send: {
   		'SelectedItemCountChanged': null,
   		'newUidSelectionList': null,
   		'SavedSelectedItemCount': null,
   		'SavedUidList': null
	},

	listen: {
	
		//message from Display bar on Presentation change 
		'PresentationChange' : function(sMessage, oData, sSrc){
			
			// set link information only if it exists
			if (oData.dbfrom){
				console.info("Inside PresentationChange in DbConnector: " + oData.readablename);
				this.setValue("Db", oData.dbto);
				this.setValue("LinkSrcDb", oData.dbfrom);
				this.setValue("LinkName", oData.linkname);
				this.setValue("LinkReadableName", oData.readablename);
			}
			//document.forms[0].submit();
		},
		
		// various commands associated with clicking different form control elements
		'Cmd' : function(sMessage, oData, sSrc){
			console.info("Inside Cmd in DbConnector: " + oData.cmd);
			this.setValue("Cmd", oData.cmd);
			
			// back button fix, clear TabCmd
			if (oData.cmd == 'Go' || oData.cmd == 'PageChanged' || oData.cmd == 'FilterChanged' || 
			oData.cmd == 'DisplayChanged' || oData.cmd == 'HistorySearch' || oData.cmd == 'Text' || 
			oData.cmd == 'File' || oData.cmd == 'Printer' || oData.cmd == 'Order' || 
			oData.cmd == 'Add to Clipboard' || oData.cmd == 'Remove from Clipboard' || 
			oData.cmd.toLowerCase().match('details')){
				this.setValue("TabCmd", '');
				console.info("Inside Cmd in DbConnector, reset TabCmd: " + this.getValue('TabCmd'));
			}

		},
		
		
		// the term to be shown in the search bar, and used from searching
		'Term' : function(sMessage, oData, sSrc){
			console.info("Inside Term in DbConnector: " + oData.term);
			this.setValue("Term", oData.term);
		},
		
		
		// to indicate the Command Tab to be in
		'TabCmd' : function(sMessage, oData, sSrc){
			console.info("Inside TABCMD in DbConnector: " + oData.tab);
			this.setValue("TabCmd", oData.tab);
			console.info("DbConnector TabCmd: " + this.getValue("TabCmd"));
		},
		
		
		// message sent from SearchBar when db is changed while in a Command Tab
		'DbChanged' : function(sMessage, oData, sSrc){
			console.info("Inside DbChanged in DbConnector");
			this.setValue("Db", oData.db);
		},
		
		// Handles item select/deselect events
		// Argument is { 'id': item-id, 'selected': true or false }
		'ItemSelectionChanged' : function(sMessage, oData, oSrc) {
			var sSelection = this.getValue("IdsFromResult");
			var bAlreadySelected = (new RegExp("\\b" + oData.id + "\\b").exec(sSelection) != null);
	       	var count =0;
	       	
			if (oData.selected && !bAlreadySelected) {
				sSelection += ((sSelection > "") ? "," : "") + oData.id;
			   	this.setValue("IdsFromResult", sSelection);
			   	if (sSelection.length > 0){
			   		count = sSelection.split(',').length;
			   	}
			   	this.send.SelectedItemCountChanged({'count': count});
			   	this.send.newUidSelectionList({'list': sSelection});
			   	jQuery(document).trigger("itemsel",{'list': sSelection});
		   	} else if (!oData.selected && bAlreadySelected) {
				sSelection = sSelection.replace(new RegExp("^"+oData.id+"\\b,?|,?\\b"+oData.id+"\\b"), '');
		   	   	this.setValue("IdsFromResult", sSelection);
				console.info("Message ItemSelectionChanged - IdsFromResult after change:  " + this.getValue("IdsFromResult"));
			   	if (sSelection.length > 0){
			   		count = sSelection.split(',').length;
			   	}
				console.info("Message ItemSelectionChanged - IdsFromResult length:  " + count);   
				this.send.SelectedItemCountChanged({'count': count});
			   	this.send.newUidSelectionList({'list': sSelection});
			   	jQuery(document).trigger("itemsel",{'list': sSelection});
		   	}
		},
				
		// FIXME: This is the "old message" that is being phased out.
		// when result citations are selected, the list of selected ids are intercepted here,
		// and notification sent that selected item count has changed.
		'newSelection' : function(sMessage, oData, sSrc){
		
			// Check if we already have such IDs in the list
			var newList = new Array();
			var haveNow = new Array();
			if(Portal.Portlet.DbConnector.originalIdList){
				haveNow = Portal.Portlet.DbConnector.originalIdList.split(',');
				newList = haveNow;
			}
			
			var cameNew = new Array();
			if (oData.selectionList.length > 0) {
				cameNew = oData.selectionList;
			}
			
			if (cameNew.length > 0) {
				for(var ind=0;ind<cameNew.length;ind++) {
					var found = 0;
					for(var i=0;i<haveNow.length;i++) {
						if (cameNew[ind] == haveNow[i]) {
							found = 1;
							break;
						}
					}
						//Add this ID if it is not in the list
					if (found == 0) {
						newList.push(cameNew[ind]);
					}
				}
			}
			else {
				newList = haveNow;
			}

				// if there was an IdList from last iteration add new values to old
			var count = 0;
			if ((newList.length > 0) && (newList[0].length > 0)){
				count = newList.length;
			}
			
			console.info("id count = " + count);
			this.setValue("IdsFromResult", newList.join(","));
			
			this.send.SelectedItemCountChanged({'count': count});
			this.send.newUidSelectionList({'list': newList.join(",")});
			jQuery(document).trigger("itemsel",{'list': newList.join(",")});
		},


		// empty local idlist when list was being collected for other purposes.
		//used by Mesh and Journals (empty UidList should not be distributed, otherwise Journals breaks)
		// now used by all reports for remove from clipboard function.
		'ClearIdList' : function(sMessage, oData, sSrc){
			this.setValue("IdsFromResult", '');
			this.send.SelectedItemCountChanged({'count': '0'});
			this.send.newUidSelectionList({'list': ''});
			jQuery(document).trigger("itemsel",{'list': ""});
		}, 


		// back button fix: when search backend click go or hot enter on term field,
		//it also sends db. this db should be same as dbconnector's db
		'SearchBarSearch' : function(sMessage, oData, sSrc){
			if (this.getValue("Db") != oData.db){
				this.setValue("Db", oData.db);
			}
		},
		
		// back button fix: whrn links is selected from DisplayBar,
		//ResultsSearchController sends the LastQueryKey from the results on the page
		// (should not be needed by Entrez 3 code)
		'LastQueryKey' : function(sMessage, oData, sSrc){
			if (this.getInput("LastQueryKey")){
				this.setValue("LastQueryKey", oData.qk);
			}
		},
		
		'QueryKey' : function(sMessage, oData, sSrc){
			if (this.getInput("QueryKey")){
				this.setValue("QueryKey", oData.qk);
			}
		},
		
		
		//ResultsSearchController asks for the initial item count in case of send to file 
		'needSavedSelectedItemCount' : function(sMessage, oData, sSrc){
			var count = 0;
			if(this.getInput("IdsFromResult")){
				if (this.getValue("IdsFromResult").length > 0){
					count = this.getValue("IdsFromResult").split(',').length;
				}
				console.info("sending SavedSelectedItemCount from IdsFromResult: " + count);
			}
			else{
				count = Portal.Portlet.DbConnector.originalCount;
				console.info("sending SavedSelectedItemCount from OriginalCount: " + count);
			}
			this.send.SavedSelectedItemCount({'count': count});
		},
		
		// Force form submit, optionally passing db, term and cmd parameters
		'ForceSubmit': function (sMessage, oData, sSrc)
		{
		    if (oData.db)
    			this.setValue("Db", oData.db);
		    if (oData.cmd)
    			this.setValue("Cmd", oData.cmd);
		    if (oData.term)
    			this.setValue("Term", oData.term);
    		Portal.requestSubmit ();
		},
		
		'LinkName': function (sMessage, oData, sSrc){
		    this.setValue("LinkName", oData.linkname);
		},
		
		'IdsFromResult': function (sMessage, oData, sSrc){
		    this.setValue("IdsFromResult", oData.IdsFromResult);
		},
		
		'SendSavedUidList': function (sMessage, oData, sSrc){
		    this.send.SavedUidList({'idlist': this.getValue("IdsFromResult")});
		}
		
	}, //listen
	
	/* other portlet functions */
	
	// DisplayBar in new design wants selected item count
	'SelectedItemCount': function(){
	    var count = 0;
		if(this.getInput("IdsFromResult")){
			if (this.getValue("IdsFromResult") != ''){
				count = this.getValue("IdsFromResult").split(',').length;
			}
		}
		else{
			count = Portal.Portlet.DbConnector.originalCount;
		}
		return count;
	},
	
	'SelectedItemList': function(){
		if(this.getInput("IdsFromResult") && this.getValue("IdsFromResult") != ''){
			return this.getValue("IdsFromResult");
		}
		else{
			return Portal.Portlet.DbConnector.originalIdList;
		}
		
	},
	setValue: function(name, value){
	    if(name == 'Term')
	        value = jQuery.trim(value);
	    this.base(name,value);
	}
},
{
	originalIdList: '',
	originalCount: 0
});

function getEntrezSelectedItemCount() {
    return $PN('DbConnector').SelectedItemCount();
}

function getEntrezSelectedItemList() {
    return $PN('DbConnector').SelectedItemList();
}
