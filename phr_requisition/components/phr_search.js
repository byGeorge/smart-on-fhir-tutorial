/********************************************************************************
* Handles patient search function.												* 
* Dependencies: JQuery, JQuery UI												*
* Author: George Roberts 6/11/2018												*
*********************************************************************************/
var PHRSearch = function () {
	// Setting up datepicker. Searching by accession ignores date range
	// search will default to current day minus def_search_days (7 days will start the search from a week ago)
	var def_search_days = 30;
	var d = new Date();
	$("#patient_search_from").datepicker({
		dateFormat: "mm/dd/yy",
	}).datepicker("setDate", "-" + def_search_days);
	$("#patient_search_to").datepicker({
		dateFormat: "mm/dd/yy",
	}).datepicker("setDate", "0");
	$(".hasDatepicker").each(function (index, element) {
	    var context = $(this);
	    context.on("blur", function (e) {
	        // The setTimeout is the key here.
	        setTimeout(function () {
	            if (!context.is(':focus')) {
	                $(context).datepicker("hide");
	            }
	        }, 250);        
	    });        
	});
	
	$(window)
		.on("bb_showing", function(){
			var h = $("#mpage_buttons").height();
			$(".all_data_wrapper .accession_info").animate({marginTop: h}, 1000);
			$("#header_arrow, #help_page").animate({marginTop: (h-20)},500);
		}).
		on("bb_hiding", function(){
			$(".all_data_wrapper .accession_info").animate({marginTop: 0}, 1000);
			$("#header_arrow, #help_page").animate({marginTop: 0},500);
		});
	
	// Sets up dialog, opens when user presses enter key in the patient search menu (header bar)
	$("#patient_search_menu")
		.dialog({
			autoOpen: false,
			modal: true,
			minWidth: 500,
			width: "80%",
			buttons: [
				{
					id: "patient_search_search",
					text: "Search",
					click: function () {
						PHRSearch.DoSearch();
					}
				},
				{
					id: "patient_search_insert",
					text: "Insert",
					click: function () {
						PHRSearch.ChooseOrder();
					}
				}
			]
		})
		.keypress(function (e) {
			if (e.which === 13 && $("#patient_search_menu").dialog("isOpen")) {
				var order_id = $("#patient_search_accordion").find("input:checked").attr("id");
				if (order_id === undefined) {
					PHRSearch.DoSearch();
				}
				else {
					PHRSearch.ChooseOrder();
				}
			}
		});
		
	// Dialog that allows user to select the order(s) that are being changed
	// does not allow multiple doctors to be selected
	$("#order_select_menu").dialog({
		autoOpen: false,
		modal: true,
		buttons: [
			{
				id: "order_select_insert",
				text: "Insert",
				click: function () {
					var checks = $("#order_select_menu input:checked");
					var oids = [];
					var idx = 0;
					for (var i = 0; i < checks.length ; i++){
						oids.push($(checks[i]).attr("id"));
					}
					if (oids.length > 0) {
						PHRSearch.InsertPatient();
						$("#order_select_menu").dialog("close");
					}
					else{
						var prev_bg = $("#order_select_menu li").css("background-color");
						$("#order_select_menu li").animate({ "background-color": "yellow" }, 500).animate({ "background-color": prev_bg }, 500);
					}
				}
			}
		]
	});
	
	// keyboard shortcuts
	$("#PatientEntry").keypress(function (e) {
		if (e.which === 13) { // enter key
			$('html, body').animate({
   				 scrollTop: "0px"
			}, 1000);
			$("#patient_search_menu").dialog("open");
			$("#patient_search_fname").focus();
			PHRSearch.PopulateSearch();
			PHRSearch.DoSearch();
			e.preventDefault();
		}
	});
	$(window).on("keydown", function(e){ 
		if ($("#patient_search_menu").dialog("isOpen")){
			if (e.which === 83 && e.ctrlKey) // ctrl + s
				PHRSearch.DoSearch();
			else if (e.which === 73 && e.ctrlKey) // ctrl + i
				PHRSearch.InsertPatient();
			else if (e.which === 40) {// down
				e.preventDefault();
				$("#patient_search_results li.search_selected").next().click();
				$("#patient_search_results").animate({
			        scrollTop:  $("#patient_search_results").scrollTop() - $("#patient_search_results").offset().top + $("#patient_search_results li.search_selected").offset().top 
			    }, 300);
			}
			else if (e.which === 38){ // up
				$("#patient_search_results li.search_selected").prev().click();
				$("#patient_search_results").animate({
			        scrollTop:  $("#patient_search_results").scrollTop() - $("#patient_search_results").offset().top + $("#patient_search_results li.search_selected").offset().top 
			    }, 300);
			}
		}
		else if ($("#order_select_menu").dialog("isOpen") && e.which === 13){
			$("#order_select_insert").trigger("click");
		}
	});
	
	// check to see if it's an AP accession
	
	function is_ap(acc){
		try{
			acc = acc.toUpperCase().replace(/-/g,'');
			var ap_regex = DataHandler.GetAPRegex();
			if ($.isNumeric(acc.replace(ap_regex, '')) &&
				!$.isNumeric(acc) &&
				(acc.length === 18 || acc.length === 11))
				return true;
			else
				return false;
		}
		catch(e){return false; }
	}
	
	//format accession for Millennium
	function format_ap_acc(acc){
		acc = acc.replace(/-/g,'');
		if (!is_ap(acc)  || acc.length !== 11)
			return acc;
		else{
			var prefix = acc.substring(0, 2);
			var rest = acc.substring(2);
			var new_acc = "00000" + prefix + "20" + rest;
			return new_acc;
		}
	}
	
	return {
		Init: function () {
			//placeholder for later functionality
		},
		// logic for search terms
		PopulateSearch: function () {
			$("#patient_search_acc, #patient_search_lname, #patient_search_fname").val("");
			var terms = $("#PatientEntry").val().split(",");
			var haslastname = false;
			for (var i = 0; i < terms.length; i++) { 
				var term = terms[i].trim().replace(/-/g, "");
				// if it looks like an accession number
				if ($.isNumeric(term) 
						|| (term.length === 18 && $.isNumeric(term))
						|| is_ap(term)
						|| term.replace(/[^0-9]/g, '').length >= 9) // if there are enough numbers for an accession
					$("#patient_search_acc").val(term);
				// if there's already a last name entry
				else if (!haslastname) {
					$("#patient_search_lname").val(term);
					haslastname = true;
				}
				// otherwise, it's a last name
				else
					$("#patient_search_fname").val(term.trim());
			}
		},
		// fixes inputs, then sends data to data handler
		DoSearch: function () {
			$("html, body").animate({ scrollTop: 0 }, 100);
			$("#patient_search_results").html("Searching...");
			// disallow wildcards
			var f = $("#patient_search_fname").val().replace(/\*/g, '');
			var l = $("#patient_search_lname").val().replace(/\*/g, '');
			var a = $("#patient_search_acc").val().replace(/[\*-]/g, '');
			// make a long-form accession number and remove container ID
			var done = false;
			while (!done){
				if (a.length <= 11 || $.isNumeric(a.substring(a.length-1, a.length)))
					done = true;
				else
					a = a.substring(0, a.length - 1);
			}
			if (is_ap(a))
				a = format_ap_acc(a);
			else if (a.length !==18 && a.length > 0){
				a = "0000020" + a;
			} 
			// fix dates
			var s = $("#patient_search_from").val().replace(/\//g,'');
			var e = $("#patient_search_to").val().replace(/\//g,'');
			// require an accession or three letters of last name, otherwise display message
			if (l.length >= 3 || a.trim() !== "")
				DataHandler.GetPatientBySearch(f, l, a, s, e, PHRSearch.ShowSearch);
			else
				$("#patient_search_results").html("Please enter an accession or at least three characters of the last name");
		},
		// formats data from data handler and displays it
		ShowSearch: function (raw_data) { 
			var data;
			var result_html = [];
			try {
				data = JSON.parse(raw_data).RECORD_DATA;
				// size limit warning
				if (data.LENGTH > 500) {
					result_html = ["Displaying only the first 500 results. Please search for something more specific."];
				}
				// no data
				else if (data.LENGTH === 0) {
					result_html = ["No results to display."];
				}
				result_html.push("<ul>");
				for (var i = 0; i < data.LENGTH; i++) {
					var li_ids = [];
					var doc_ids = [];
					var ord_mnems = [];
					// data- attributes don't exist in this version of IE, so we're hiding the information in other ways
					for (var j = 0; j < data.DATA[i].ORDER_LENGTH; j++){
						li_ids.push(data.DATA[i].ORDERS[j].ORDER_ID);
						doc_ids.push(data.DATA[i].ORDERS[j].PHY_NAME);
						ord_mnems.push(data.DATA[i].ORDERS[j].MNEMONIC);
					}
					result_html.push("<li id='" + li_ids.join("@") + "'>"); 
					result_html.push("<span class='bold'>", data.DATA[i].LAST_NAME, ", ", data.DATA[i].FIRST_NAME, "</span>");
					result_html.push("<span class='hidden'>", doc_ids.join("@"), "~", ord_mnems.join("@"), "</span>");
					result_html.push(" DOB: ", data.DATA[i].DOB, ", Accession: ", data.DATA[i].ACCESSION, "</li>");
				}
				result_html.push("</ul>"); 
				$("#patient_search_menu").parent().animate({top: "4rem"}, 1000);
				$("#patient_search_insert").focus();
			}
			catch (e) { 
				result_html = ["No results to display."];
			}
			$("#patient_search_results")
				.html(result_html.join(''))
				.on("click","li", function(){ // use hidden info
					$(".search_selected").removeClass("search_selected");
					$(this).addClass("search_selected");
					var hid_text = $(this).find(".hidden").html();
					var docs = hid_text.split("~")[0].split("@");
					var mnems = hid_text.split("~")[1].split("@");
					var oids = $(this).attr("id").split("@");
					var new_html = [];
					for (var i = 0; i < docs.length; i++){
						new_html.push("<li id='" + oids[i] + "'><input name='order_doc_select' type='checkbox' value='", docs[i], "'><p class='mnems'>Order: ", mnems[i], 
							"</p><p class='phy'>Physician: ", docs[i],"</p></li>");
					}
					$("#order_select_menu ul").html(new_html.join(''));
				});
			$("#patient_search_results li").eq(0).click();
		},
		// checks doctors on order for similarity
		ChooseOrder: function(){
			$("#order_select_menu ul").off("click");
			var doctors = [];
			var phys = $("#order_select_menu ul li p.phy");
			if (phys.length > 1){
				for (var i = 0; i < phys.length; i++) {
					phy = $(phys[i]).text();;
					if (doctors.indexOf(phy) < 0)
						doctors.push(phy);
					$(phys[i]).closest("li").addClass("doc_" + doctors.indexOf(phy));
				}
				$("#order_select_menu ul").on("click","input",function(){
					var classes = $(this).closest("li").attr("class").split(" "); 
					var cclass; 
					for (var i = 0; i < classes.length; i++){
						if (classes[i].indexOf("doc_") > -1)
							cclass = classes[i];
					} 
					if ($("#order_select_menu ul li").not('.' + cclass).find("input:checked").length > 0) {
						$("#order_select_menu ul li").not('.' + cclass).find("input").prop("checked", false);
						alert("To update multiple orders at the same time, the physicians must be the same.");
					}
				});
				$("#patient_search_menu").dialog("close");
				$("#order_select_menu").dialog("open");
			}
			else if (phys.length === 1) {
				$("#order_select_menu ul li input").prop("checked", true);
				$("#patient_search_menu").dialog("close");
				PHRSearch.InsertPatient();
			}
			else {
				var prev_bg = $("#patient_choice").css("background-color");
				$("#patient_choice").animate({ "background-color": "yellow" }, 500).animate({ "background-color": prev_bg }, 500);
			}
		},
		// inserts patient or prompts user to choose a patient
		InsertPatient: function () {
			var order_ids = [];
			$("#order_select_menu input:checked").closest("li").each(function(){
				order_ids.push($(this).attr("id"));
			}); 
			if (order_ids.length > 0) {
				PHRController.ResetPage();
				$("#patient_search_menu").dialog("close");
				DataHandler.GetPatientByOID(order_ids);
			}
			else {
				var prev_bg = $("#patient_choice").css("background-color");
				$("#patient_choice").animate({ "background-color": "yellow" }, 500).animate({ "background-color": prev_bg }, 500);
			}
		},
		// Sets up menu when PHR is opened from the Editors' MPage
		InsertFromEditorsPage: function(raw_data) {;
			var ins_html = [];
			
			try{
				var data = JSON.parse(raw_data); 
				for (var i = 0; i < data.RECORD_DATA.ORDERS_SIZE; i++){
					ins_html.push("<li id='", data.RECORD_DATA.ORDERS[i].ORDER_ID, "'><input name='order_doc_select' type='checkbox' value='", 
						data.RECORD_DATA.ORDERS[i].PHYSICIAN_ID, "'><p class='mnems'>Order: ", data.RECORD_DATA.ORDERS[i].ORDER_MNEMONIC, 
							"</p><p class='phy'>Physician: ", data.RECORD_DATA.ORDERS[i].PHYSICIAN_NAME,"</p></li>");
				}
			}
			catch(e){ alert("Error retrieving data from Millennium: " + e.message); }
			$("#order_select_menu ul").html(ins_html.join(''));
			$("#order_select_menu").dialog("open");
			PHRSearch.ChooseOrder();
		}
	};
}();
