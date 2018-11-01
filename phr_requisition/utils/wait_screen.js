/********************************************************************************
* Displays an animated screen to entertain the user while waiting for data to	* 
* return from a query.															* 
* Dependencies: Jquery, JQuery UI												*
* Author: George Roberts 6/11/2018												*
*********************************************************************************/
var WaitScreen = function () {
	var waitlist = [];
	return {
		// starts the wait screen. If already started, it adds to the text displayed at the bottom
		Start: function (text_to_display) {
			waitlist.push(text_to_display);
			if (waitlist.length === 1) {
				var wait_html = [];
				wait_html.push("<div id='waitscreen'>",
									"<div id= 'wait_header'>Please Wait...</div>",
									"<div id='wait_centre'><div id='gol_container'></div></div>",
									"<div id='wait_footer'>" + text_to_display + "</div></div>");
				$("#wait_screen_placeholder").html(wait_html.join(''));
				$("#wait_centre").height($(window).height() - 140);
				gol.Run();
				var wait_timer = setInterval(function () {
					if (waitlist.length === 0) {
						$("#waitscreen").remove();
						clearInterval(wait_timer);
						gol.Stop();
					}
				}, 100);
			}
			else { 
				$("#wait_footer").html(waitlist.join(', '));
			}
		},
		// removes the text from the wait screen. If no parameters are passed, it completely 
		// stops the wait screen. If no text is left in the waitlist, it stops the waitscreen
		Stop: function (text_displayed) {
			if (text_displayed) {
				var index = waitlist.indexOf(text_displayed);
				waitlist.splice(index, 1);
				$("#wait_footer").html(waitlist.join(', '));
			}
			else {
				$("#waitscreen").remove();
				gol.Stop();
			}
		}
	};
}();

// Game of Life functions (adds pattern to the wait screen)
// Based off of Conway's Game of Life
var gol_same_count = 0; // number of times the gol_population has been the same at the end of the round
var gol_population = 0; // number of live cells at the end of a round. Prevents board stagnation
var gol = function () {
	
	var quit_at = 10; // number of times before game is considered "stuck"
	var wide = 16; // how wide the cell is
	var high = 18.5; // how tall the cell is
	var w = 0; // number of horizontal cells
	var h = 0; // number of vertical cells
	var interval; // board change loop
	return {
		// starts the board
		Run: function () {
			gol_same_count = 0; //resets count
			var $container = $("#gol_container");
			// figure out how many cells tall and wide the board will be
			w = Math.floor($container.width() / wide) - 1;
			h = Math.floor($container.height() / high) - 1;
			// and make it into a table
			var board = ["<table>"];
			for (var i = 0; i < h; i++) {
				board.push("<tr id='row" + i + "'>");
				for (var j = 0; j < w; j++) {
					if (Math.random() > 0.20)
						board.push("<td><span id='gol" + i + "-" + j + "'></span></td>");
					else
						board.push("<td><span id='gol" + i + "-" + j + "' class='gol_alive'></span></td>");
				}
				board.push("</tr>");
			}
			board.push("</table");
			$container.html(board.join(''));
			// change the board at a set interval
			interval = setInterval(function () {
				if (gol_same_count === quit_at){ // if the board is stuck
					clearInterval(interval);
					gol.Run();
				}
				else if ($("#gol_container").find("span").length > 0) // if the board still exists, change it
					gol.Change();
				else { // otherwise, stop running the game
					clearInterval(interval);
				}
			}, 100);
		},
		// changes board
		Change: function () {
			var kill = []; // cells that will die
			var vivify = []; // cells that will revive
			for (var i = 0; i < h; i++) {
				for (var j = 0; j < w; j++) {
					var live_neighbours = 0;
					var prow = i - 1;
					var nrow = i + 1;
					var pcol = j - 1;
					var ncol = j + 1;
					// get all the neighbours and see how many live ones there are
					var $neighbours = $("#gol" + prow + "-" + pcol + ", #gol" + prow + "-" + j + ", #gol" + prow + "-" + ncol + ", #gol" // row above
									+ i + "-" + pcol + ", #gol" + i + "-" + ncol + ", #gol" // in row
									+ nrow + "-" + pcol + ", #gol" + nrow + "-" + j + ", #gol" + nrow + "-" + ncol); // row below
					$neighbours.each(function () {
						if ($(this).hasClass("gol_alive"))
							live_neighbours++;
					});
					// if the live neighbor count is less that two or greater than three, the cell will "die"
					if (live_neighbours < 2 || live_neighbours > 3)
						kill.push($("#gol" + i + "-" + j));
					// if there are exactly three live neighbours, the cell will "live"
					else if (live_neighbours === 3)
						vivify.push($("#gol" + i + "-" + j));
				}
			} 
			
			//prevents stabilisation
			var curpop = $(".gol_alive").length;
			if (curpop === gol_population)
				gol_same_count ++;
			else
				gol_same_count = 0;
			gol_population = curpop;
			for (var i = 0; i < kill.length; i++)
				kill[i].removeClass("gol_alive");
			for (var i = 0; i < vivify.length; i++)
				vivify[i].addClass("gol_alive");
		},
		// stop changing board
		Stop: function () {
			clearInterval(interval);
		}
	};
}();


