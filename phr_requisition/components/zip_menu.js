/********************************************************************************
* Handles zip code dialogs														* 
* Dependencies: Jquery, JQuery UI												*
* Author: George Roberts 6/11/2018												*
*********************************************************************************/
var ZipMenu = function(){
	var cur_zip_field = "";
	var cur_locations = [];
	$(".zipcode").keyup(function () { 
		if ($(this).val().length === 5) {
			cur_zip_field = $(this).attr("id");
			ZipMenu.VerifyZipCode();
		}
	});
	$("#confirmzip").keyup(function (e) {
		if (e.which === 13) {
			$("#zipokay").click();
		}
		else if (e.which === 27) {
			$("#zipcancel").click();
			cur_zip_field = "";
		}
	});
	$("#choose_city").keyup(function (e) {
		if (e.which === 13) {
			$("#cityokay").click();
		}
		else if (e.which === 27) {
			$("#citycancel").click();
		}
	});
	$("#confirm_zip, #choose_city").dialog({
		dialogClass: "no-close",
		autoOpen: false,
		modal: true,
		closeOnEscape: false
	});
	// inserts selected city
	function SelectCity(loc_text){
		var $parent = $("#" + cur_zip_field).closest(".data_wrapper");
		var details = loc_text.replace('"', "").split("^"); 
		$parent.find(".state").val(details[1].split("~")[0]);
		$parent.find(".state").trigger("change");
		$parent.find(".city").val(details[0].split("~")[0]);
		$parent.find(".county").val(details[2].split("~")[0]);
		$("#choose_city").dialog("close"); 
		$("#confirm_zip").dialog("close");
		$parent.find(".phone").focus();
		cur_locations = [];
	}
	// if only one result is returned, insert the city. Otherwise, display a list of cities
	function VerifyCityMakeOptionList(list) {
		$("#confirm_zip").dialog("close");
		if (list.length === 1)
			SelectCity(cur_locations[0]);
		else {
			$("#choosecity").html(PHRController.MakeOptionList(list));
			$("#choose_city").dialog("open");
		}
	}
	return {
		// parses location list
        ParseLocations: function(data){
			try{
				var j_data = JSON.stringify(JSON.parse(data).RECORD_DATA.ZIP_INFO);
				var city_list = [];
				cur_locations = j_data.split("|");
				for (var i = 0; i < cur_locations.length; i++){ 
					city_list.push(cur_locations[i].split("^")[0].replace('"', "").trim());
				}
				WaitScreen.Stop("Getting zip code data");
				VerifyCityMakeOptionList(city_list);
			}
			catch(e){
				WaitScreen.Stop();
				alert("No zip codes found.");
				cur_locations = [];
				$("#choose_city").dialog("close");
				ZipMenu.VerifyZipCancel();
			}
		},
		// closes the city list and goes back to the zip code
		VerifyCityCancel: function() {
			$("#choose_city").dialog("close");
			$("#confirm_zip").dialog("open");
		},
		// selects city, if no city is selected, option list will flash yellow
        VerifyCityOK: function () {
            var selected_city = $("#choosecity").val();
            if (selected_city !== "") {
                var selected;
                for (var i = 0; i < cur_locations.length; i++) {
                    if (selected_city === cur_locations[i].split("^")[0].replace('"', "").trim())
                        SelectCity(cur_locations[i]);
                }
            }
            else{
                var $city = $("#choose_city label, #choosecity");
                var prev_bg = $city.css("background-color");
                $city.animate({ "background-color": "yellow" }, 500).animate({ "background-color": prev_bg }, 500);
            }
        },
        // sends an error message and blanks out city, state, zip, and county fields
        VerifyZipCancel: function() {
			alert("Zip code entry error. Check data and try again.");
			$("#confirmzip, #" + cur_zip_field).val("");
			$("#confirm_zip").dialog("close");
			$("#" + cur_zip_field).closest(".data_wrapper").find(".city, .state, .county").val("");
			cur_zip_field = "";
		},
		// opens confirm zip menu when zip code reaches 5 characters
        VerifyZipCode: function() {
			$("#confirmzip").val("");
			$("#confirm_zip").dialog("open");
	
			setTimeout(function () {
				$("#confirmzip").focus();
			}, 100);
	    },
	    // if the zip codes don't match, close and clear the city, state, zip and county fields, if they do match,
	    // go to the next menu
	    VerifyZipOK: function() {
			var zip = $("#confirmzip").val();
			if (zip === ""){}
			else if (zip !== $("#" + cur_zip_field).val())
				ZipMenu.VerifyZipCancel();
			else {
				$("#confirm_zip").dialog("close");
				$("#choose_city").dialog("open");
				DataHandler.GetLocationsByZip(zip, ZipMenu.ParseLocations);
			}
		}
	};
}();
