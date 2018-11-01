/********************************************************************************
* Master controller for PHR Requisition MPage.									* 
* Dependencies: JQuery, JQuery UI												*
* Author: George Roberts 6/11/2018												*
*********************************************************************************/
var PHRController = function () {
    var order_id;
    var required_fields;
    var report_state = "";
    // binding events
    
    $(window)
    	.on("Permission_Success", function(){
    		if (PermissionHandler.CanAccessMPage("AllAdmin"))
    			$(".patient_search, #header_arrow").show();
    	})
    	.keydown(function (e) { 
            if (e.which === 187 && e.altKey) { // alt + =
            	var focused = $("input:focus, select:focus");
            	if (focused.length < 1)
            		focused = $(".phr_data").first();
            	// if both are open or closed, close or open them
                if ($("#header_arrow").hasClass("up_arrow") && $("#footer_arrow").hasClass("down_arrow") ||
						$("#header_arrow").hasClass("down_arrow") && $("#footer_arrow").hasClass("up_arrow")) {
                	PHRController.HideShowHeader();
                	PHRController.HideShowFooter();
                }
                
                else if ($("#header_arrow").hasClass("down_arrow")) {
                	// open top bar if closed
                	PHRController.HideShowHeader();
                }
                else {
                 	// open bottom bar if closed
                	PHRController.HideShowFooter();
                }
                	
                setTimeout(function(){ 
                	$(focused).focus();
                }, 500);
            }
            else if (!$("#employer_search").dialog("isOpen") && !$("#patient_search_menu").dialog("isOpen")) {
                if (e.which === 76 && e.altKey) // alt + L
                    PHRController.ClearPage();
                else if (e.which === 71 && e.altKey) // alt + g
                    PHRController.ResetPage();
                else if (e.which === 87 && e.altKey) // alt + w
                    window.close();
                else if (e.which === 83 && e.ctrlKey) { // ctrl + s 
                	$("#PatientEntry").focus();
                }
            }
        });
    $("#patientstate").on("change", function(){
    	$(".phr_required").removeClass("phr_required");
        report_state = $(this).val();
        if ($(this).val() !== "") {
            DataHandler.GetRequiredFields($(this).val(), PHRController.HighlightRequiredFields);
        }
        else if ($(this).val() === "" && DataHandler.GetPatientData().CLIENT_STATE !== ""){
            report_state = DataHandler.GetPatientData().CLIENT_STATE;
            DataHandler.GetRequiredFields(report_state, PHRController.HighlightRequiredFields);
        }
    });
    $("#birthdate").on("keyup", function(){
        if (report_state !== "" && $("#birthdate").val().length === 10)
            DataHandler.GetRequiredFields(report_state, PHRController.HighlightRequiredFields);
    });
    
     $(".phone").on("keyup", function(){
    	var ph = $(this).val();
    	if (ph.length > 50)
    		$(this).val(ph.substring(0,50));
    });
    
    $("#accession_orders").dialog({
    	autoOpen: false,
    	modal: true
    });
    $(".patient_search").animate({top: $("#mpage_buttons").height()}, 1000);
    $(document).on("bb_hiding", function(e){
    	$(".patient_search").animate({top: "0rem"}, 1000);
    });
    
    $(document).on("bb_showing", function(e){
    	$(".patient_search").animate({top: $("#mpage_buttons").height()}, 1000);
    });
    
    $("#physiciannpi").blur(function(e){
    	if (!DataHandler.ValidateNPI( $("#physiciannpi").val() )) {
    		alert("Invalid NPI");
    		$("#physiciannpi").val("");
    	}
    });
    
    return {
    	//Main page setup
        InitializePage: function () { 
        	// remembers previous settings
            DataHandler.GetPreferences(PHRController.RestorePreferences);
            PHRSearch.Init();
            try {
               /** This is not what this part of the criterion is supposed to do, but we're
               hijacking this parameter so that we can pass necessary data to this MPage.
               The PPR_CD will contain the Order ID of the test selected in the Editors MPage. **/
               order_id = phr_params.CRITERION.PPR_CD; 
               if (order_id > 0) {
					PHRController.HideShowHeader(); 
                   	DataHandler.GetPatientFromEditorsPage(order_id);
               }
               else
                 	$("#PatientEntry").focus();
			}
            catch (e) {
               alert("Unable to get order id.\nError: " + e.message);
            }
            $(".data_wrapper").sortable({
                stop: PHRController.SavePreferences, 
                items: ".phr_data",
                tolerance: "pointer"
            });
            $(".state").html(PHRController.MakeOptionList(DataHandler.GetStates()));
            $(".county").html(PHRController.MakeOptionList(DataHandler.GetCounties()));
            $("#race").html(PHRController.MakeOptionList(DataHandler.GetRaces()));
            $("#ethnicgroup").html(PHRController.MakeOptionList(DataHandler.GetEthnicGroups()));
            $("#sex").html(PHRController.MakeOptionList(DataHandler.GetSexes()));
            $("#purpose").html(PHRController.MakeOptionList(DataHandler.GetPurpose()));
            

            
            //patient
            PHRController.CreateMask("#birthdate", "##/##/####");
            PHRController.CreateMask("#patientphone", "(###) ###-#### ext [#]");
            PHRController.CreateMask("#patientzip", "#####");
            
            //employer
            PHRController.CreateMask("#employerphone", "(###) ###-#### ext [#]");

            //physician
            PHRController.CreateMask("#physicianphone", "(###) ###-#### ext [#]");
            PHRController.CreateMask("#physicianzip", "#####");
            
            WaitScreen.Stop("Setting up page");
        },
        // reset
        ClearPage: function () { 
            $(".phr_data input, .phr_data select").val("");
            $("#accession_orders").dialog("close");
            $(".phr_data.phr_required").removeClass("phr_required");
            $(".accinfo_acc").html("No accession selected");
            $(".accinfo_ord").html("No orders selected");
            $(window).trigger("ClearPage");
            DataHandler.ClearPatient();
            report_state = "";
        },
        // restricts allowed characters in an input
        CreateMask: function (target, mask) {
            $(target).focus(function () {
                $(this).trigger("keypress");
            })
                .keyup(function (e) {
                    var format = mask;
                    var caretbeg = this.selectionStart;
                    var caretend = this.selectionEnd;
                    var allowed_length = format.length;
                    var val = $(this).val();
                    var val_index = 0;
                    for (var i = 0; i < format.length; i++) {
                        var format_char = format.charAt(i);
                        var val_char = val.charAt(val_index);
                        switch (format_char) {
                            case ("#"):
                                if (!$.isNumeric(val_char))
                                    val = val.slice(0, val_index) + val.slice(val_index + 1, val.length);
                                else
                                    val_index++;
                                break;
                            case ("["):
                                format_char = format.charAt(i + 1);
                                format = format.replace("[", "").replace("]", "");
                                allowed_length = allowed_length - 2;
                                var done = false;
                                while (!done) {
                                    val_char = val.charAt(val_index);
                                    if (format_char === "#" && $.isNumeric(val_char)) {
                                        val_index++;
                                        allowed_length++;
                                    }
                                    else if (format_char === "#" && !$.isNumeric(val_char) && val_char !== "") {
                                        val = val.slice(0, val_index) + val.slice(val_index + 1, val.length);
                                    }
                                    else
                                        done = true;
                                }
                                break;
                            default:
                                var skip = 1;
                                var done = false;
                                var checking;
                                while (!done) {
                                    checking = format.charAt(i + skip);
                                    if (checking !== "#" && checking !== "[" && checking !== "") {
                                        skip++;
                                    }
                                    else {
                                        done = true;
                                    }
                                }

                                if (val_char !== format_char && i < val.length) {
                                    var remove_char = 0;
                                    if ((!$.isNumeric(val_char) && checking === "#") || (!$.isNumeric(val_char) && checking === "[" && format.charAt(i + skip + 1) === "#"))
                                        remove_char = 1;

                                    val = val.slice(0, val_index) + format.slice(i, skip + i) + val.slice(val_index + remove_char, val.length);
                                    caretbeg = caretbeg + skip - remove_char;
                                    caretend = caretend + skip - remove_char;
                                    allowed_length = allowed_length + skip - remove_char;
                                    val_index = val_index + skip + 1 - remove_char;
                                    i = i + skip + remove_char;
                                }
                                else {
                                    val_index++;
                                }
                                break;
                        }
                    }
                    if (val.length > allowed_length)
                        val = val.slice(0, format.length);
                    $(this).val(val);
                    this.setSelectionRange(caretbeg, caretend);
                });
        },
        // returns the state to report to, if any
        GetReportState: function(){
        	return report_state;
        },
        // hide or show footer bar
        HideShowFooter: function () {
            var $foot = $("#footer_arrow");
            if ($foot.hasClass("up_arrow")) {
                $(".confirm_buttons").fadeIn(500);
                $(".all_data_wrapper").children(":last-child").animate({ "marginBottom": "50px"});
                $foot.removeClass("up_arrow").addClass("down_arrow");
                $foot.html("&#8681").attr("title", "Show");
            }
            else {
                $(".confirm_buttons").fadeOut(500);
                $(".all_data_wrapper").children(":last-child").animate({ "marginBottom": "0" });
                $foot.removeClass("down_arrow").addClass("up_arrow");
                $foot.html("&#8679").attr("title", "Hide");
            }
        },
        // hide or show header bar
        HideShowHeader: function () { 
            var $head = $("#header_arrow");
            if ($head.hasClass("up_arrow")) {
                $(".all_data_wrapper h1").animate({marginTop: 0}, 500);
                $(".patient_search").fadeOut(500);
                $head.removeClass("up_arrow").addClass("down_arrow");
                $("#main_title").addClass("up_arrow");
                $head.html("&#8681").attr("title", "Show patient search bar");
            }
            else {
            	$(".all_data_wrapper h1").animate({marginTop: "3rem"}, 500);
                $(".patient_search").fadeIn(500);
                $head.removeClass("down_arrow").addClass("up_arrow");
                $("#main_title").removeClass("up_arrow");
                $head.html("&#8679").attr("title", "Hide patient search bar");
            }
        },
        // If a field is required by the reporting state, highlight it yellow
        HighlightRequiredFields: function (fields) {
            if (fields.PATIENT_LAST_NAME)
                $("#patientlastname").closest(".phr_data").addClass("phr_required");
            else
                $("#patientlastname").closest(".phr_data").removeClass("phr_required");

            if (fields.PATIENT_FIRST_NAME)
                $("#patientfirstname").closest(".phr_data").addClass("phr_required");
            else
                $("#patientfirstname").closest(".phr_data").removeClass("phr_required");

            if (fields.PATIENT_MIDDLE_NAME)
                $("#patientmiddlename").closest(".phr_data").addClass("phr_required");
            else
                $("#patientmiddlename").closest(".phr_data").removeClass("phr_required");

            if (fields.PATIENT_SEX)
                $("#sex").closest(".phr_data").addClass("phr_required");
            else
                $("#sex").closest(".phr_data").removeClass("phr_required");

            if (fields.MRN)
                $("#mrn").closest(".phr_data").addClass("phr_required");
            else
                $("#mrn").closest(".phr_data").removeClass("phr_required");

            if (fields.PATIENT_BIRTH_DATE)
                $("#birthdate").closest(".phr_data").addClass("phr_required");
            else
                $("#birthdate").closest(".phr_data").removeClass("phr_required");
            if (fields.RACE)
                $("#race").closest(".phr_data").addClass("phr_required");
            else
                $("#race").closest(".phr_data").removeClass("phr_required");

            if (fields.ETHNIC_GROUP)
                $("#ethnicgroup").closest(".phr_data").addClass("phr_required");
            else
                $("#ethnicgroup").closest(".phr_data").removeClass("phr_required");

            if (fields.PATIENT_ZIP)
                $("#patientzip").closest(".phr_data").addClass("phr_required");
            else
                $("#patientzip").closest(".phr_data").removeClass("phr_required");

            if (fields.PATIENT_STREET_ADDRESS_1 || fields.PATIENT_STREET_ADDRESS_2){ 
            	if (!fields.PATIENT_STREET_ADDRESS_1)
	                $("#patientstreetaddress1").css("background-color", "white");
	            if (!fields.PATIENT_STREET_ADDRESS_2)
	                $("#patientstreetaddress2").css("background-color", "white");
	            $("#patientstreetaddress1").closest(".phr_data").addClass("phr_required");
            }
            else
                $("#patientstreetaddress1").closest(".phr_data").removeClass("phr_required");

            if (fields.PATIENT_CITY)
                $("#patientcity").closest(".phr_data").addClass("phr_required");
            else
                $("#patientcity").closest(".phr_data").removeClass("phr_required");

            if (fields.PATIENT_STATE)
                $("#patientstate").closest(".phr_data").addClass("phr_required");
            else
                $("#patientstate").closest(".phr_data").removeClass("phr_required");

            if (fields.PATIENT_COUNTY)
                $("#patientcounty").closest(".phr_data").addClass("phr_required");
            else
                $("#patientcounty").closest(".phr_data").removeClass("phr_required");

            if (fields.PATIENT_PHONE)
                $("#patientphone").closest(".phr_data").addClass("phr_required");
            else
                $("#patientphone").closest(".phr_data").removeClass("phr_required");

            if (fields.GUARDIAN_LAST_NAME)
                $("#parentorguardianlastname").closest(".phr_data").addClass("phr_required");
            else
                $("#parentorguardianlastname").closest(".phr_data").removeClass("phr_required");

            if (fields.GUARDIAN_FIRST_NAME)
                $("#parentorguardianfirstname").closest(".phr_data").addClass("phr_required");
            else
                $("#parentorguardianfirstname").closest(".phr_data").removeClass("phr_required");

            if (fields.EMPLOYER_NAME)
                $("#employername").closest(".phr_data").addClass("phr_required");
            else
                $("#employername").closest(".phr_data").removeClass("phr_required");

            if (fields.OCCUPATION)
                $("#occupation").closest(".phr_data").addClass("phr_required");
            else
                $("#occupation").closest(".phr_data").removeClass("phr_required");

            if (fields.EMPLOYER_STREET_ADDRESS_1 || fields.EMPLOYER_STREET_ADDRESS_2){ 
            	if (!fields.EMPLOYER_STREET_ADDRESS_1)
	                $("#employerstreetaddress1").css("background-color", "white");
	            if (!fields.EMPLOYER_STREET_ADDRESS_2)
	                $("#employerstreetaddress2").css("background-color", "white");
	            $("#employerstreetaddress1").closest(".phr_data").addClass("phr_required");
            }
            else
                $("#employerstreetaddress1").closest(".phr_data").removeClass("phr_required");

            if (fields.EMPLOYER_CITY)
                $("#employercity").closest(".phr_data").addClass("phr_required");
            else
                $("#employercity").closest(".phr_data").removeClass("phr_required");

            if (fields.EMPLOYER_STATE)
                $("#employerstate").closest(".phr_data").addClass("phr_required");
            else
                $("#employerstate").closest(".phr_data").removeClass("phr_required");

            if (fields.EMPLOYER_ZIP)
                $("#employerzip").closest(".phr_data").addClass("phr_required");
            else
                $("#employerzip").closest(".phr_data").removeClass("phr_required");

            if (fields.EMPLOYER_PHONE)
                $("#employerphone").closest(".phr_data").addClass("phr_required");
            else
                $("#employerphone").closest(".phr_data").removeClass("phr_required");

            if (fields.PHYSICIAN_LAST_NAME)
                $("#physicianlastname").closest(".phr_data").addClass("phr_required");
            else
                $("#physicianlastname").closest(".phr_data").removeClass("phr_required");

            if (fields.PHYSICIAN_FIRST_NAME)
                $("#physicianfirstname").closest(".phr_data").addClass("phr_required");
            else
                $("#physicianfirstname").closest(".phr_data").removeClass("phr_required");

            if (fields.PHYSICIAN_NPI_LEAD)
                $("#physiciannpilead").closest(".phr_data").addClass("phr_required");
            else
                $("#physiciannpilead").closest(".phr_data").removeClass("phr_required");

            if (fields.PHYSICIAN_STREET_ADDRESS_1 || fields.PHYSICIAN_STREET_ADDRESS_2){ 
            	if (!fields.PHYSICIAN_STREET_ADDRESS_1)
	                $("#physicianstreetaddress1").css("background-color", "white");
	            if (!fields.PHYSICIAN_STREET_ADDRESS_2)
	                $("#physicianstreetaddress2").css("background-color", "white");
	            $("#physicianstreetaddress1").closest(".phr_data").addClass("phr_required");
            }
            else
                $("#employerstreetaddress1").closest(".phr_data").removeClass("phr_required");

            if (fields.PHYSICIAN_CITY)
                $("#physiciancity").closest(".phr_data").addClass("phr_required");
            else
                $("#physiciancity").closest(".phr_data").removeClass("phr_required");

            if (fields.PHYSICIAN_STATE)
                $("#physicianstate").closest(".phr_data").addClass("phr_required");
            else
                $("#physicianstate").closest(".phr_data").removeClass("phr_required");

            if (fields.PHYSICIAN_COUNTY)
                $("#physiciancounty").closest(".phr_data").addClass("phr_required");
            else
                $("#physiciancounty").closest(".phr_data").removeClass("phr_required");

            if (fields.PHYSICIAN_ZIP)
                $("#physicianzip").closest(".phr_data").addClass("phr_required");
            else
                $("#physicianzip").closest(".phr_data").removeClass("phr_required");

            if (fields.PHYSICIAN_PHONE)
                $("#physicianphone").closest(".phr_data").addClass("phr_required");
            else
                $("#physicianphone").closest(".phr_data").removeClass("phr_required");

            if (fields.PURPOSE)
                $("#purpose").closest(".phr_data").addClass("phr_required");
            else
                $("#purpose").closest(".phr_data").removeClass("phr_required");
            
            // parses age. "yrs" = years, "m" = months, "w" = weeks, "d" = days
            function GetAgeByUnit(unit){
                var today = new Date();
                var birthDate = new Date(1902,0,1);
                if (unit === "yrs"){ // years
                    var age = today.getFullYear() - birthDate.getFullYear();
                    var m = today.getMonth() - birthDate.getMonth();
                    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                        age--;
                    }
                    return age;
                }
                else if (unit === "m"){ // months
                    var years = today.getFullYear() - birthDate.getFullYear();
                    var m = today.getMonth() - birthDate.getMonth();
                    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate()))
                        years--;
                    var months = years * 12;
                    
                    var d = today.getDay() - birthDate.getDay();
                    if (d < 0)
                        m--;
                    return months + m;
                }
                else if (unit === "w" || unit === "d"){ // weeks
                    var total = today.getTime() - birthDate.getTime(); // in milliseconds since Jan 1 1970
                    var days = total/86400000; // 86400000 ms in a day.
          
                    if (unit === "w")
                        return (days/7);
                    else
                        return(days);
                }
            }
 
 			// parses data from table to allow for multiple conditions 
            function ConditionalQualifier(condition, target){ 
                var symbol = condition.replace(/[^><=]/g, '');
                var num = parseInt(condition.replace(/[^1-9]/g, ''));
                var unit = condition.replace(/[><= 1-9]/g, '');
                // if there's a greater-than or less-than symbol, assume it's comparing age
                if (symbol === ">" || symbol === ">="){ 
                	if (symbol === ">")
                        num++; // adding 1 to the number makes it >=
                    if (GetAgeByUnit(unit) >= num)
                        $(target).closest(".phr_data").removeClass("phr_required");
                    else
                        $(target).closest(".phr_data").addClass("phr_required");
                }
				else if (symbol === "<" || symbol === "<="){ 
                	if (symbol === "<")
                        num--; // subtracting 1 to the number makes it <=
                    if (GetAgeByUnit(unit) <= num)
                        $(target).closest(".phr_data").removeClass("phr_required");
                    else
                        $(target).closest(".phr_data").addClass("phr_required");
                }
                else{ // OR expression
                	var origin;
                	switch(condition.replace("OR", "").trim()){
                		case "PatientDateOfBirth":
                			origin = "#birthdate";
                			break;
                		case "PatientGuardianName":
                			origin = ".child_data input";
                			break;
                		case "PatientOccupation":
                			origin = "#occupation";
                			break;
                		case "PatientEmployer":
                			origin = "#employername";
                			break;
                		case "PatientEmployerPhone":
                			origin = "#employerphone";
                			break;
                		case "PhysicianAddress":
                			origin = "#physicianzip, #physicianstreetaddress1, #physiciancity, #physicianstate";
                			break;
                		case "PhysicianPhone": 
	                		origin = "#physicianphone";
	                		break;                			
                	}
                	var empty = true;
                    $(target).each(function(){
                    	if ($(this).val() !== "")
                    		empty = false;
                    });
                    // adds or removes the yellow highlight when one of the fields has data
                    if (!empty)
                    	$(origin).closest(".phr_data").removeClass("phr_required");
                    if ( $(origin).val() !== "")
                    $(target).closest(".phr_data").removeClass("phr_required");
                    $(origin).on("keyup.conditional_or", function(){ 
                    if ($(origin).val() !== "")
                    	$(target).closest(".phr_data").removeClass("phr_required");
                    else
                    	$(target).closest(".phr_data").addClass("phr_required");
                    });
                    $(target).on("change.conditional_or", function(){
                    	var empty = true;
                    	$(target).each(function(){
                    		if ($(this).val() !== "")
                    			empty = false;
                    	});
                    if (!empty)
                    	$(origin).closest(".phr_data").removeClass("phr_required");
                    else
                    	$(origin).closest(".phr_data").addClass("phr_required");
                    });
                }
            }
            
            // remove binding to avoid a memory leak
            $("#birth_date, .phr_data input, .phr_data select").off("change.conditional_or").off("keyup.conditional_or");
               
            // now for the conditional requirements
			if (fields.EMPLOYER_STREET_ADDRESS_1 === true && fields.EMPLOYER_ADDRESS_CONDITION !== ""){ 
                var conditions = fields.EMPLOYER_ADDRESS_CONDITION.split(",");
                for (var i = 0; i < conditions.length; i++) {
                     ConditionalQualifier(conditions[i], "#employerstreetaddress1, #employercity, #employerstate, #employerzip");
                }
            }
            
            if (fields.OCCUPATION === true && fields.OCCUPATION_CONDITION !== ""){
                var conditions = fields.OCCUPATION_CONDITION.split(",");
                for (var i = 0; i < conditions.length; i++) {
                     ConditionalQualifier(conditions[i], "#occupation");
                }
            }
            
             if (fields.EMPLOYER_NAME === true && fields.EMPLOYER_CONDITION !== ""){
                var conditions = fields.PATIENT_EMPLOYER_CONDITION.split(",");
                for (var i = 0; i < conditions.length; i++) {
                     ConditionalQualifier(conditions[i], "#employername");
                }
            }
            
            if (fields.PHYSICIAN_STREET_ADDRESS_1 === true && fields.PHYSICIAN_ADDRESS_CONDITION !== ""){ 
                var conditions = fields.PHYSICIAN_ADDRESS_CONDITION.split(",");
                for (var i = 0; i < conditions.length; i++) {
                     ConditionalQualifier(conditions[i], "#physicianstreetaddress1, #physiciancity, #physicianstate, #physicianzip");
                }
            }
            
            if (fields.PHYSICIAN_PHONE === true && fields.PHYSICIAN_PHONE_CONDITION !== ""){ 
                var conditions = fields.PHYSICIAN_ADDRESS_CONDITION.split(",");
                for (var i = 0; i < conditions.length; i++) {
                     ConditionalQualifier(conditions[i], "#physicianphone");
                }
            }
            
			if (fields.GUARDIAN_NAME === true && fields.GUARDIAN_NAME_CONDITION !== ""){
                var conditions = fields.GUARDIAN_NAME_CONDITION.split(",");
                for (var i = 0; i < conditions.length; i++) {
                     ConditionalQualifier(conditions[i], ".child_data");
                }
            }
            else if (fields.GUARDIAN_NAME === true){ 
            	// assume guardian not required if patient over age 18 and they didn't give an age
            	ConditionalQualifier("< 18", ".child_data");
            }
        },
        // Use the patient data saved in the DataHandler
        InsertData: function () { 
            var data = DataHandler.GetPatientData();
            report_state = "";
            $("#accession_orders").html("");
            if (data.PATIENT_LAST_NAME !== undefined) {
				// maps JSON object to HTML
                order_id = data.ORDER_ID;
                // patient
                $("#patientlastname").val(data.PATIENT_LAST_NAME);
                $("#patientfirstname").val(data.PATIENT_FIRST_NAME);
                $("#patientmiddlename").val(data.PATIENT_MIDDLE_NAME);
                $("#sex").val(data.PATIENT_SEX);
                $("#mrn").val(data.MRN);
                $("#birthdate").val(data.PATIENT_BIRTH_DATE).datepicker();
                $("#race").html(PHRController.MakeOptionList(DataHandler.GetRaces(), data.RACE)); 
                $("#ethnicgroup").html(PHRController.MakeOptionList(DataHandler.GetEthnicGroups(), data.ETHNIC_GROUP));
                $("#patientzip").val(data.PATIENT_ZIP);
                $("#patientstreetaddress1").val(data.PATIENT_STREET_ADDRESS_1);
                $("#patientstreetaddress2").val(data.PATIENT_STREET_ADDRESS_2);
                $("#patientcity").val(data.PATIENT_CITY);
                $("#patientstate").html(PHRController.MakeOptionList(DataHandler.GetStates(), data.PATIENT_STATE)); 
                if (data.PATIENT_STATE === "")
                	report_state = data.CLIENT_STATE;
                else {
                	report_state = data.PATIENT_STATE;
                }
                $("#patientcounty").html(PHRController.MakeOptionList(DataHandler.GetCounties(data.PATIENT_STATE), data.PATIENT_COUNTY));
                $("#patientphone").val(data.PATIENT_PHONE);

                //employer
                $("#employername").val(data.EMPLOYER_NAME);
                $('#occupation').val(data.OCCUPATION);
                $("#employerzip").val(data.EMPLOYER_ZIP);
                $("#employerstreetaddress1").val(data.EMPLOYER_STREET_ADDRESS_1);
                $("#employerstreetaddress2").val(data.EMPLOYER_STREET_ADDRESS_2);
                $("#employercity").val(data.EMPLOYER_CITY);
                $("#employerstate").val(data.EMPLOYER_STATE);
                $("#employerphone").val(data.EMPLOYER_PHONE);

                //physician
                $("#physicianlastname").val(data.PHYSICIAN_LAST_NAME);
                $("#physicianfirstname").val(data.PHYSICIAN_FIRST_NAME);
                $("#physiciannpi").val(data.PHYSICIAN_NPI);
                $("#physicianzip").val(data.PHYSICIAN_ZIP);
                $("#physicianstreetaddress1").val(data.PHYSICIAN_STREET_ADDRESS_1);
                $("#physicianstreetaddress2").val(data.PHYSICIAN_STREET_ADDRESS_2);
                $("#physiciancity").val(data.PHYSICIAN_CITY);
                $("#physicianstate").html(PHRController.MakeOptionList(DataHandler.GetStates(), data.PHYSICIAN_STATE));
                if (report_state === "")
                    report_state = data.PHYSICIAN_STATE;
                DataHandler.GetRequiredFields(report_state, PHRController.HighlightRequiredFields);
                $("#physiciancounty").html(PHRController.MakeOptionList(DataHandler.GetCounties(data.PHYSICIAN_STATE), data.PHYSICIAN_COUNTY));
                $("#physicianphone").val(data.PHYSICIAN_PHONE);
                $("#purpose").html(PHRController.MakeOptionList(DataHandler.GetPurpose(), data.PURPOSE));

                //if patient is a child
                $("#parentorguardianlastname").val(data.GUARDIAN_LAST_NAME);
                $("#parentorguardianfirstname").val(data.GUARDIAN_FIRST_NAME);
                $(".phr_data").first().focus();

                $(".accinfo_acc").html(data.ACCESSION);
				var ord_html = [];
				if (data.ORDERS.length > 0) {
					for (var i = 0; i < data.ORDERS.length; i++)
						ord_html.push(data.ORDERS[i].ORDER_MNEMONIC)
				}
				else
					ord_html.push("No orders selected");
				$(".accinfo_ord").html(ord_html.join(', '));
            }
        },
        // makes a drop-down list out of an array of options, and automatically selects the one matching selected (case insensitive)
        MakeOptionList: function (array_of_options, selected) {
            var arr = [];
            for (var i = 0; i < array_of_options.length; i++) {
                if  (arr.indexOf(array_of_options[i]) < 0 && array_of_options[i].length > 0)
                    arr.push(array_of_options[i]);
            }
            arr = arr.sort();
            var toReturn = [];
            toReturn.push("<option></option>");
            var found = false;
            for (var i = 0; i < arr.length; i++) {
                if (selected && arr[i].toLowerCase() === selected.toLowerCase()){
                    toReturn.push("<option selected>" + arr[i] + "</option>");
                    found = true;
                }
                else
                    toReturn.push("<option>" + arr[i] + "</option>");
            }
            if (!found && selected !== undefined)
            	toReturn.push("<option selected>" + selected + "</option>");
            return toReturn.join('');
        },
        // reverts page to saved patient data
        ResetPage: function() {
            $(".phr_data input, .phr_data select").val("");
            PHRController.InsertData();
            $(".phr_required").removeClass("phr_required");
        },
        // restores saved preferences
        RestorePreferences: function (raw_prefs) { 
            try { 
                var pre_prefs = JSON.parse(raw_prefs).RECORD_DATA; 
                var pref_size = pre_prefs.SIZE; 
                var pref_array = [];
                for (var i = 0; i < pref_size; i++)
                    pref_array.push(pre_prefs.PREFERENCES[i].PREFERENCE); 
                var prefs = JSON.parse(pref_array.join(''));
                var pat = prefs.PATIENT; 
                if (pat.length === $(".patient_data").length) {
                    for (var i = 0; i < pat.length; i++) { 
                        var obj = $(".patient_data_wrapper .originalposition" + pat.indexOf(i+1)).detach();
                        $(".patient_data_wrapper").append(obj);
                    }
                } 
                
                var emp = prefs.EMPLOYER;
                if (emp.length === $(".employer_data").length) { 
                    for (var i = 0; i < emp.length; i++) {
                        var obj = $(".employer_data_wrapper .originalposition" + emp.indexOf(i+1)).detach();
                        $(".employer_data_wrapper").append(obj); 
                    }
                }

                var phy = prefs.PHYSICIAN;
                if (phy.length === $(".physician_data").length) {
                    for (var i = 0; i < phy.length; i++) {
                        var obj = $(".physician_data_wrapper .originalposition" + phy.indexOf(i+1)).detach();
                        $(".physician_data_wrapper").append(obj);
                    }
                }

                var kid = prefs.CHILD; 
                if (kid.length === $(".child_data").length) {
                    for (var i = 0; i < kid.length; i++) {
                        var obj = $(".child_data_wrapper .originalposition" + kid.indexOf(i+1)).detach();
                        $(".child_data_wrapper").append(obj);
                    }
                }
            }
            catch (e) { } // no preference saved
        },
        // closes window.
        ReturnToEditors: function () {
            window.close();
        },
        // saves current preferences (order of input fields)
        SavePreferences: function(){
            var new_prefs = {};
            
            var pat_l = $(".patient_data").length;
            var pat_a = []; 
            for (var i = 0; i < pat_l; i++){
                pat_a.push($(".patient_data_wrapper .originalposition" + i).index());
            }
            
            var emp_l = $(".employer_data").length;
            var emp_a = []; 
            for (var i = 0; i < emp_l; i++){
                emp_a.push($(".employer_data_wrapper .originalposition" + i).index());
            }
            
            var phy_l = $(".physician_data").length;
            var phy_a = []; 
            for (var i = 0; i < phy_l; i++){
                phy_a.push($(".physician_data_wrapper .originalposition" + i).index());
            }
            
            var chi_l = $(".child_data").length;
            var chi_a = []; 
            for (var i = 0; i < chi_l; i++){
                chi_a.push($(".child_data_wrapper .originalposition" + i).index());
            }
            
            new_prefs["PATIENT"] = pat_a;
            new_prefs["EMPLOYER"] = emp_a;
            new_prefs["PHYSICIAN"] = phy_a;
            new_prefs["CHILD"] = chi_a; 
            DataHandler.SendPreferences(JSON.stringify(new_prefs));
        },
        SelectOrders: function(){ 
        	PHRController.SendPatientData();
        },
        // maps input fields to a JSON object, then sends it to the DataHandler
        SendPatientData: function(){
        	//if the last name field is blank (no active selection), return without doing anything
        	if ($("#patientlastname").val() === "")
        	 	return;
        	var race = $("#race option:selected").text();
        	if (race === undefined)
        		race = "";
        	var ethnic_group = $("#ethnicgroup option:selected").text();
        	if (ethnic_group === undefined)
        		ethnic_group = "";
        	var data = {
                "PATIENT_SEX":$("#sex").val(),
                "PATIENT_BIRTH_DATE":$("#birthdate").val(),
                "RACE":race,
                "ETHNIC_GROUP":ethnic_group,
                "PATIENT_ZIP":$("#patientzip").val(),
                "PATIENT_STREET_ADDRESS_1":$("#patientstreetaddress1").val(),
                "PATIENT_STREET_ADDRESS_2":$("#patientstreetaddress2").val(),
                "PATIENT_CITY":$("#patientcity").val(),
                "PATIENT_STATE": $("#patientstate").val(),
                "PATIENT_COUNTY":$("#patientcounty").val(),
                "PATIENT_PHONE":$("#patientphone").val(),
                "GUARDIAN_LAST_NAME":$("#parentorguardianlastname").val(),
                "GUARDIAN_FIRST_NAME":$("#parentorguardianfirstname").val(),
                "EMPLOYER_NAME":$("#employername").val(),
                "OCCUPATION":$('#occupation').val(),
                "EMPLOYER_PHONE":$("#employerphone").val(),
                "EMPLOYER_ZIP":$("#employerzip").val(),
                "EMPLOYER_STREET_ADDRESS_1":$("#employerstreetaddress1").val(),
                "EMPLOYER_STREET_ADDRESS_2":$("#employerstreetaddress2").val(),
                "EMPLOYER_CITY":$("#employercity").val(),
                "EMPLOYER_STATE":$("#employerstate").val(),
                "EMPLOYER_COUNTY":$("#new_empl_county").val(),
                "EMPLOYER_COUNTRY":$("#new_empl_country").val(),
                "EMPLOYER_CONTACT":$("#new_empl_contact").val(),
                "PHYSICIAN_NPI":$("#physiciannpi").val(),
                "PHYSICIAN_ZIP":$("#physicianzip").val(),
                "PHYSICIAN_STREET_ADDRESS_1":$("#physicianstreetaddress1").val(),
                "PHYSICIAN_STREET_ADDRESS_2":$("#physicianstreetaddress2").val(),
                "PHYSICIAN_CITY":$("#physiciancity").val(),
                "PHYSICIAN_STATE":$("#physicianstate").val(),
                "PHYSICIAN_COUNTY":$("#physiciancounty").val(),
                "PHYSICIAN_PHONE":$("#physicianphone").val(),
                "PURPOSE":$("#purpose").val()
            };
            DataHandler.SendOrderData(data, PHRController.ReturnToEditors);
        },
        SetReportState: function(state){
        	report_state = state;
        }
    };
}();
