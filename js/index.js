// IE becomes very unhappy when we forget. Let's not make IE unhappy
if (typeof(console) === 'undefined') {var console = {};console.log = console.error = console.info = console.debug = console.warn = console.trace = console.dir = console.dirxml = console.groupEnd = console.time = console.timeEnd = console.assert = console.profile = function () {};}
if (typeof(console.group) === 'undefined') {console.group = console.log; console.groupEnd = function () {}}

//string helper
if (!String.prototype.trim) { String.prototype.trim = function () { return this.replace(/^\s+|\s+$/g, ''); };}

/*set color opacity - helps overlaying column*/
var Highcharts = Highcharts || {};
Highcharts.getOptions().colors = Highcharts.map(Highcharts.getOptions().colors, function (color) { return Highcharts.Color(color).setOpacity(0.75).get('rgba');});
var chart, subChart, grid;
var colors = Highcharts.getOptions().colors;
var ko = ko || {};

/*jq extensions*/
$.extend({
    distinct : function (arr) {
		return $.grep(arr, function (el, index) {
			return index == $.inArray(el, arr);
		});
	},
	removeEmpty : function (arr) {
		return $.grep(arr, function (i) {
			if (i !== "") {
				return i;
			}
		});
	}
});

/*our view model */
var $V = {
	Budget : {},
	Actual : {},
	CarryOver: {},
	chartOptions : {},
	drawChart : function () {
        if ( chart !== undefined) { chart.destroy() }
		chart = drawAreaChart($V.chartOptions);
	}
};

$V.StartDate = '4/1/2013';
$V.EndDate = '3/31/2014';

/*configuration & helpers*/
var $C = {
	IsDev8 : window.location.href.toLowerCase().indexOf('c9.io') >= 0,
	rnd : (new Date()).getTime(),
	InvoiceExpenseListUrl : function () {
		return $C.IsDev8 ? './mock/InvoiceExpenseList.json' : '/_layouts/com.mizuho.sharepoint.portal/MrHandler.ashx'
	},
	BudgetItemsUrl : function () {
		return $C.IsDev8 ? './mock/BudgetItems.json' : '/forms/purchaseorder/_layouts/com.mizuho.sharepoint.purchaseorder/PoHandler.ashx'
	},
	CarryOverItemsUrl : function () {
		return $C.IsDev8 ? './mock/CarryOvers.json' : '/forms/purchaseorder/_layouts/com.mizuho.sharepoint.purchaseorder/PoHandler.ashx'
	},	
	InvoicesInDateRangeUrl : function () {
		return $C.IsDev8 ? './mock/InvoicesInDateRange.json' : '/forms/invoice/_layouts/com.mizuho.sharepoint.portal/MrHandler.ashx'
	},
	CACHE : {},
	EXPCAT : [],
	EXCLUDEEXPCAT: ['CLEARING CHARGES PAYABLE', 'SALES TAX PAYABLE'],
	el1Name: function(code) {
		switch (code)  {
			case '01': 
                return 'FIXED INCOME DIVISION';
			case '02': 
                return 'FUTURES DIVISION';
			case '03': 
                return 'EQUITY DIVISION'; 
            case '05': 
                return 'CORPORATE DIVISION'; 		
		}
		
		return code;
	},
	el4Name : function (code) {
		if (code===null)
			return "";
			
		var sCacheKey = 'EL4CODE-' + code;
		if ($C.CACHE[sCacheKey]) {
			//console.log(code + " returned from cache as " + $C.CACHE[sCacheKey]);
			return $C.CACHE[sCacheKey].toString();
		} else {
			/*first try to resolve from budget items */
			var colMatch = $.grep($V.Budget.Data, function (i) {
					return i.Cost_x0020_Center_x000a_Number == code
				});
			if (colMatch.length > 0) {
				$C.CACHE[sCacheKey] = colMatch[0].Cost_x0020_Center_x0020_Name.toString();
				return colMatch[0].Cost_x0020_Center_x0020_Name.toString();
			}

			/*if we have a match then cache it & return it*/
			if (colMatch.length > 0) {
				$C.CACHE[sCacheKey] = colMatch[0].name.toString();
				return colMatch[0].name.toString();
			}
		}
		return code.toString();
	},	
	el2Name : function (code) {
		if (code===null)
			return "";
			
		var sCacheKey = 'EL2CODE-' + code;
		if ($C.CACHE[sCacheKey]) {
			//console.log(code + " returned from cache as " + $C.CACHE[sCacheKey]);
			return $C.CACHE[sCacheKey].toString();
		} else {
			/*first try to resolve from budget items */
			var colMatch = $.grep($V.Budget.Data, function (i) {
					return i.BudgetGL == code
				});
			if (colMatch.length > 0) {
				$C.CACHE[sCacheKey] = colMatch[0].Exp_x002d_Sub_x0020_Category.toString();
				return colMatch[0].Exp_x002d_Sub_x0020_Category.toString();
			}

			/* check coda */
			if (colMatch.length === 0) {
				colMatch = $.grep($C.EXPCAT, function (i) {
						return i.code == code
					});
			}

			/*if we have a match then cache it & return it*/
			if (colMatch.length > 0) {
				$C.CACHE[sCacheKey] = colMatch[0].name.toString();
				return colMatch[0].name.toString();
			}
		}
		return code.toString();
	},
	el2Code : function (name) {
		if (name===null)
			return "";
			
		var sCacheKey = 'EL2NAME-' + name;
		if ($C.CACHE[sCacheKey]) {
			//console.log(name + " returned from cache as " + $C.CACHE[sCacheKey]);
			return $C.CACHE[sCacheKey].toString();
		} else {
			/*first try to resolve from budget items */
			var colMatch = $.grep($V.Budget.Data, function (i) {
					return i.Exp_x002d_Sub_x0020_Category == name
				});
			if (colMatch.length > 0) {
				$C.CACHE[sCacheKey] = colMatch[0].BudgetGL.toString();
				return colMatch[0].BudgetGL.toString();
			}

			/* check coda */
			if (colMatch.length === 0) {
				colMatch = $.grep($C.EXPCAT, function (i) {
						return i.name == name
					});
			}

			/*if we have a match then cache it & return it*/
			if (colMatch.length > 0) {
				$C.CACHE[sCacheKey] = colMatch[0].code.toString();
				return colMatch[0].code.toString();
			}
		}
		return name.toString();
	},	
	ITDept : function(budgetKey) {
		var sCacheKey = 'ITDept-' + budgetKey;
		if ( $C.CACHE[sCacheKey] ) {			
			return $C.CACHE[sCacheKey].toString();
		} else {
			var colMatch = $.grep($V.Budget.Data, function(i) { return i.Key == budgetKey});
			if ( colMatch.length > 0 ) {
				$C.CACHE[sCacheKey] = colMatch[0]['IT_x0020_Department'].toString();
				return $C.CACHE[sCacheKey].toString();
			}
		}
		
		return '';
	},
	zoomOut : function () {
		if (!chart) {
			chart = $('#container').highcharts();
		}
		chart.yAxis[0].setExtremes(0, chart.yAxis[0].max * 1.25, true);
		chart.showResetZoom();
		return false;
	},
	zoomIn : function () {
		if (!chart) {
			chart = $('#container').highcharts();
		}
		chart.yAxis[0].setExtremes(0, chart.yAxis[0].max * 0.75, true);
		chart.showResetZoom();
		return false;
	},
	sOptValStr : function (arr) {
		var sStr = ':All';
		$.each(arr, function () {
			sStr += ';' + this + ':' + this;
		});
		return sStr;
	},
	gridGroupClick : function (model, e, sFieldName) {
		var oTarget = $(e.target);
		var oGroupView = grid.getGridParam('groupingView');
		if (!oTarget.hasClass('btn-info')) {
			if ($.inArray(sFieldName, oGroupView.groupField) < 0) {
				oGroupView.groupField.push(sFieldName);
			}
			oTarget.addClass('btn-info');
		} else {
			oGroupView.groupField = $.map(oGroupView.groupField, function (i) {
					if (i != sFieldName) {
						return i
					}
				})
				oTarget.removeClass('btn-info');
		}
		/*turn on summary for all group levels*/
		oGroupView.groupSummary = $.map(oGroupView.groupField, function () {
				return true;
			});
		grid.setGridParam({
			grouping : oGroupView.groupField.length > 0
		});
		grid.setGridParam({
			groupingView : oGroupView
		});
		grid.trigger('reloadGrid');
		//console.log(oGroupView);
        
        

            
        
	},
	CarryOver: function(p_sExpCatCode) {
		var colMatch = $.grep($V.CarryOver, function(i) {return i.NEW_x0020_EL2 == p_sExpCatCode})	
		var oCarryOver = {
			y: 0,
			invoices: [],
			drilldown: {name: 'Carry Over: ' + $C.el2Name(p_sExpCatCode), categories:[], data:[] },
			name: $C.el2Name(p_sExpCatCode)
		};
		$.each(colMatch, function() {
			oCarryOver.y += this.To_x0020_be_x0020_expensed_x0020;
			if ( this.SharePoint_x0020_Invoice.length ) { 
				var sInvoiceItemId = this.SharePoint_x0020_Invoice.toString().split('-')[1];
				oCarryOver.invoices.push(sInvoiceItemId);
				oCarryOver.drilldown.categories.push(sInvoiceItemId);
				oCarryOver.drilldown.data.push(Math.round(this.To_x0020_be_x0020_expensed_x0020*100)/100);
			};
		});
		
		oCarryOver.y = Math.round(oCarryOver.y * 100)/100;
		return oCarryOver;
	},
	GoBack: function() {
        subChart.destroy(); 
        $('#subBackBtn, #subChart').addClass('hide'); 
        $('#container, #chartBtns').removeClass('hide'); 	
	}
}

console.log('Loading InvoiceExpenseList: ' + $C.InvoiceExpenseListUrl());
$.getJSON($C.InvoiceExpenseListUrl(), {get : 'InvoiceExpenseList', _nocache : $C.rnd }, function (json) {

	$C.EXPCAT = json;
    
	console.log('Loading CarryOver');	
    $.getJSON($C.CarryOverItemsUrl(), { get : 'CarryOvers', _nocache : $C.rnd, contentType : 'application/json'	}, function(json) {
        
		$V.CarryOver = []; //json;  //removing for now
		$V.CarryOver['ExpSubCat'] = $.distinct( $.map($V.CarryOver, function(i) {return i.NEW_x0020_EL2}));		
		
        console.log('Loading BudgetItems');
		$.getJSON($C.BudgetItemsUrl(), { get : 'BudgetItems', _nocache : $C.rnd, contentType : 'application/json' }, function (json) {
			$V.Budget.Data = json;
			$V.Budget.Summary = {
				ExpSubCat : $.distinct($.map($.map($V.Budget.Data, function (i) {
							return {
								code : i.BudgetGL,
								name : i.Exp_x002d_Sub_x0020_Category
							}
						}).sort(function (x, y) {
							return x.name < y.name ? -1 : 1
						}), function (i) {
						return i.code.trim()
					}))
			}
			$V.Budget.Summary.Amount = GetBudgetAmount();

			console.log('Loading InvoicesInDateRange');
			$.getJSON($C.InvoicesInDateRangeUrl(), {
				get : 'InvoicesInDateRange',
				StartDate : $V.StartDate,
				EndDate : $V.EndDate,
				ITInvoice: true,
				InStatus: 'Processed by AP,Under AP Review,Waiting for AP Approval',
				_nocache : $C.rnd, contentType : 'application/json' }, function (json) {
                
				console.log('Mapping Data');				
				var colUniqueItTeam = [];
				$V.Actual.Data = json;	

                //prepare the AllocationData
				$V.Actual.AllocationData = $.map($V.Actual.Data, function (i) {				
						var colValue =  $.grep(i.AllocationData.Data, function(it) {  return $.inArray($C.el2Name(it.el2), $C.EXCLUDEEXPCAT) < 0 });
						$.each(colValue, function () {		
								var sItDept = $C.ITDept(this.budgetKey);
								if ( sItDept === '' ) {
									sItDept = i.ITDepartment;
								}                                
                                this.InvoiceIdValue = i.InvoiceIdValue;
                                this.InvoiceIdDesc = (i.InvoiceIdDesc || '').trim();
								this.InvoiceId = i.Id;
								this.ITDepartment = sItDept;
								this.Budgeted = (this.budgetKey || '').trim() !== '' ? 'Budgeted' : 'Not Budgeted';
                                this.Recurring = (this.projectName || '').trim().toLowerCase() == 'recurring' ? 'Yes' : 'No';
								this.projectCode =  (this.projectCode || '').trim();
								this.projectName = (this.projectName || '').trim();
								this.el2 = (this.el2 || '').trim();
								this.el2Name = (this.el2Name || '').trim();	
								
								if (this.ITDepartment !== '' && $.inArray(this.ITDepartment, colUniqueItTeam) < 0 ) { colUniqueItTeam.push(this.ITDepartment)}								
								
						});
						return colValue;
					});
                    
                //build unique set of exp cat
                var colExpSubCatCode = $.distinct($.map($.map($V.Actual.Data, function (i) {
    							return $.map(i.AllocationData.Data, function (j) {
									if (j.el2 === null || j.el2 === "") {
										if (j.el2BookAs !== null )
										{
											//if the el2 was never set by someone in IT then display the accounting/coda value
											//(this can happen for POs)
											j.el2 = j.el2BookAs; 
										} else {
											//set to default code to prompt someone to take action on this
											j.el2 = "00000"
										}
									}									
									return {
										code : j.el2,
										name : $C.el2Name(j.el2)
									};
									
								});
							}).sort(function (x, y) {
								return x.name < y.name ? -1 : 1
							}), function (i) {
							return i.code
						}));

                //this block simply builds a unique set of dimensions
				$V.Actual.Summary = {
					ExpSubCat : colExpSubCatCode,
                    ExpSubCatObj: $.map(colExpSubCatCode, function(i){ return {name: $C.el2Name(i), code: i} }),
					ITDept: colUniqueItTeam,
					Project : $.removeEmpty($.distinct($.map($.map($V.Actual.Data, function (i) {
									return $.map(i.AllocationData.Data, function (j) {
										return {
											code : j.projectCode === null ? '' : j.projectCode,
											name : (j.projectName === null ? '' : j.projectName).trim()
										};
									});
								}).sort(function (x, y) {
									return x.name < y.name ? -1 : 1
								}), function (i) {
								return i.name
							}))),
					Division : $.distinct($.map($.map($V.Actual.Data, function (i) {
								return $.map(i.AllocationData.Data, function (j) {
									return {
										code : j.el1,
										name : j.el1Name
									};
								});
							}).sort(function (x, y) {
								return x.name < y.name ? -1 : 1
							}), function (i) {
							return i.name
						})),
					Department : $.distinct($.map($.map($V.Actual.Data, function (i) {
								return $.map(i.AllocationData.Data, function (j) {
									return {
										code : j.el4,
										name : j.el4Name
									};
								});
							}).sort(function (x, y) {
								return x.name < y.name ? -1 : 1
							}), function (i) {
							return i.name
						})),
					BudgetKey : $.removeEmpty($.distinct($.map($V.Actual.AllocationData, function (i) {
								return (i.budgetKey === null ? '' : i.budgetKey).trim()
							}))),
					Budgeted : ['Budgeted', 'Not Budgeted'],						
                    Recurring : ['Yes', 'No'],
					Spend : {}
				};

                //computes actual spend 
                $V.Actual.Summary.Spend = GetActualSpend();

				//$('#container').html('');
				setTimeout(function () {$('[rel=tooltip]').tooltip();}, 800);
                
                $V.chartOptions = GetChartOptions();
                $V.drawChart();
                
				drawPie();
				drawGrid();
                
				ko.applyBindings($V, document.getElementById("budgetMain"));
                
                $('.select2').select2({}).on('change', function(){
                    
                    console.log($(this).val());                    
                    
                        var oDataOption = {
                            recurring:false,
                            itdept: $(this).val()
                        };
        
                    //is recurring active?
                    if ( $.inArray('Recurring', grid.getGridParam('groupingView').groupField) >= 0) {                        
                        oDataOption.recurring = true;
                    }
                    
                    
                    $V.Budget.Summary.Amount = GetBudgetAmount(oDataOption);
                    $V.Actual.Summary.Spend = GetActualSpend(oDataOption);
                    
                    //rebuild chart options based off of selection
                    $V.chartOptions = GetChartOptions();
                    $V.drawChart();   
                    
                    grid.GridUnload();
                    drawGrid();
                    
                });
                
                $('#filterControls').removeClass('hide');
                $('#groupControls').removeClass('hide');

			});
		});
	});
});



function drawAreaChart(options) {
	$('#chartBtns').removeClass('hide');
	return $('#container').highcharts({
		chart : {
			type : 'column',
			margin : [50, 40, 180, 80],
			width: '950',
			height: '600',
			zoomType : 'xy',
			resetZoomButton : {
				position : {
					x : 0,
					y : -45
				}
			}
		},
		title : {
			text : 'Budget vs Actual',
			align : 'left'
		},
		subtitle : {
			text : 'FY2013: YTD',
			align : 'left'
		},
		legend : {
			align : 'right',
			verticalAlign : 'top',
			y : -5,
			x : -285,
			layout : 'horizontal'

		},
		xAxis : {
			title : {
				text : ''
			},
			type : 'category',
			labels : {
				rotation: -90,
				align: 'right',
				style: {
					fontSize: '13px',
					fontFamily: 'Verdana, sans-serif'
				}

			}
		},
		yAxis : {
			title : {
				text : 'Amount'
			},
			endOnTick : false,
			startOnTick : false,
			min : 0,
			max : options.yAxis && options.yAxis.max || null

		},
		plotOptions : {
			column : {
				allowPointSelect : false,
				cursor : 'pointer',
				stacking : 'normal',
				grouping : false,
				shadow : false,
				dataLabels : {
					enabled : false,
					formatter : function () {
						return this.y;
					}
				},
				point : {
					events : {
						click : function () {
							var drilldown = this.drilldown;
							if (drilldown) { // drill down
								$('#subChart, #subBackBtn').removeClass('hide');
								$('#container, #chartBtns').addClass('hide');
								
								window.location.href = '#drilldown';
								
								subChart = $('#subChart').highcharts({
										chart : {
											type : 'column',
											margin : [50, 40, 180, 80],
											width: '800',
											height: '500',
											zoomType : 'xy'
										},
										title : {
											text : drilldown.name
										},
										subtitle : {
											text : 'Click column to view Invoice'
										},
										legend : {
											enabled : false,
											align : 'right',
											verticalAlign : 'top',
											y : -5,
											x : -75,
											layout : 'vertical'
										},
										xAxis : {
											title : {
												text : 'Invoice'
											},
											categories : drilldown.categories,
											labels : {
												enabled : true,
												rotation : -90,
												align : 'right',
												style : {
													fontSize : '14px',
													fontFamily : 'Arial'
												},
												useHTML : false
											}
										},
										yAxis : {
											title : {
												text : 'Amount'
											}
										},
										plotOptions : {
											column : {
												cursor : 'pointer',
												dataLabels : {
													enabled : false,
													inside : true,
													rotation : -90,
													color : 'black',
													formatter : function () {
														return this.x
													}
												},
												shadow : false,
												point : {
													events : {
														click : function () {
															openInvoice(this.category);
														}
													}
												}
											}
										},
										tooltip : {
											shared : true,
											headerFormat : '<b>Invoice {point.x}</b><br />',
											pointFormat : '<span>{series.name}</span>: <b>${point.y:,.0f}</b><br/>'

										},
										series : [{
												name : drilldown.name,
												color : colors[6],
												foo : 'bar',
												data : drilldown.data
											}
										]
									}).highcharts(); // return chart;
							}
						}
					}
				}
			},
			area : {
				marker : {
					enabled : false,
					symbol : 'circle',
					radius : 2,
					states : {
						hover : {
							enabled : true
						}
					}
				}
			}
		},
		tooltip : {
			shared : true,
			pointFormat : '<span>{series.name}: <b>${point.y:,.0f}</b><br/>'
		},
		series : options.series || []
	}).highcharts(); // return chart;
}

function drawPie() {

	var colActualBreakdown = $.map($V.Actual.Summary.Spend, function (i) {
			return {
				name : i.Name,
				y : i.Amount.y
			}
		});
	console.log('drawing pie');
	$('#pie').highcharts({
		legend : {
			layout : 'vertical',
			align: 'right'	
		},
		chart : {
			type : 'pie',			
			width: 500,
			zoomType : 'xy'
		},
		title : {
			text : 'Actual Summary',
			align: 'left'
			
		},
		tooltip : {
			formatter : function () {
				return '<b>' + this.point.name + '</b>:<br /> Spend: $' + Math.round(this.y * 100) / 100 + ' (' + Math.round(this.percentage * 100) / 100 + '%)';
			}
		},
		plotOptions : {
			pie : {
				allowPointSelect : true,
				cursor : 'pointer',
				dataLabels : {
					enabled : false,
					distance : -50,
					useHTML : false,
					verticalAlign : 'top',
					color : '#000000',
					connectorColor : '#000000',
					formatter : function () {
						console.log(this);
						return '<div style="font-size:9px;">' + this.point.name.replace(/IT-/, '').replace(/ /, '<br />').replace(/-/, '<br />') + '</div>';
					}
				},
				showInLegend : true
			}
		},
		series : [{
				type : 'pie',
				name : 'Actual Breakdown',
				data : colActualBreakdown
			}
		]
	});
}

function openInvoice(id) {
	oSearch2.select2('data', {
		id : id,
		text : 'Invoice ' + id,
		attributes : [{
				Key : 'Type',
				Value : 'Invoice'
			}
		]
	});
	OpenS2Val();
	return false;
}


/* this is to catch the use of the native browser back button when drilldown is active */
$(window).on('hashchange', function(e) {
	if ( window.location.hash === '' ) {
		$C.GoBack();
	}
});


function GetActualSpend(options) {
    var options = options || [];
	/* actual spend by expsubcat */
	/**/ 
    
    $V.Actual.FilteredData = [];
	return  $.map($V.Actual.Summary.ExpSubCat, function (c) {
        
    		var colMatch = $.grep($V.Actual.AllocationData, function (i) {               
                
                //filter Recurring if selected
                if ( options.recurring ) {                     
                    if(i.projectName != 'Recurring') {
                        return false;
                    }                    
                } 
                
                //filter ITDepartment if selected
                if ( options.itdept) {
                    if ( $.inArray(i.ITDepartment, options.itdept) < 0 ) {
                        return false;
                    }
                }         
                    
                return i.el2 == c;                
                    
			}).sort(function (x, y) {return x.InvoiceId < y.InvoiceId ? -1 : 1});
			
            
            
            //compute total per invoice
            var dTotal = 0;
			var dBudgeted = 0;
			var oDrillDown = { categories : [],data : [] };            
			$.each(colMatch, function (i) {
				
                //used for data grid
                $V.Actual.FilteredData.push(this);
                
                dTotal += isNaN(this.amount) ? 0 : Number(this.amount);
				
                // build a set of unique invoice's
				var iArIdx = $.inArray(this.InvoiceId, oDrillDown.categories);
				if (iArIdx < 0) {
					oDrillDown.categories.push(this.InvoiceId);
					oDrillDown.data.push(isNaN(this.amount) ? 0 : Number(this.amount));
				} else {
					//add the amount to data value
					oDrillDown.data[iArIdx] += isNaN(this.amount) ? 0 : Number(this.amount);
				}
                
			});

            //return an for $.map
		    return {
				Name : $C.el2Name(c),
				Code : c,
				Percent : 0,
				Amount : {
					y : dTotal,
					name : $C.el2Name(c),
					drilldown : {
						name : 'Actual Spend: ' + $C.el2Name(c),
						categories : oDrillDown.categories,
						data : oDrillDown.data
					}
				}
			}
		});    
}

function GetGridData(options) {
    return $V.Actual.FilteredData ;
}

function GetBudgetAmount(options) {
    var options = options || [];
    return $.map($V.Budget.Summary.ExpSubCat, function (c) {
				var dTotal = 0;
                
                
				$.each($V.Budget.Data, function () {
					if (this.BudgetGL == c) {
                        
                        //filter Recurring if selected
                        if ( options.recurring ) {
                            if ( this['Project_x0020_Name_x0020__x002f_'] != 'Recurring' ) {
                                return 0;
                            }
                        } 
                        
                        //filter ITDepartment if selected
                        if ( options.itdept) {
                            if ( $.inArray(this['IT_x0020_Department'], options.itdept) < 0 ) {
                                return 0;
                            }
                        }
                        
					    dTotal += isNaN(this.Total) ? 0 : Number(this.Total);
					}
				});
                
                
				return {
					Name : $C.el2Name(c),
					Code : c,
					Amount : {
						y : dTotal,
						name : $C.el2Name(c)
					}
				}
			});
}


function GetChartOptions(options) {
    
    var options = options || [];
    
	/* build a combined unique set of exp cat */
	console.log('Building unique set of exp cat data');
	var colCat = []
	$.each($V.Actual.Summary.ExpSubCat, function () { if ($.inArray($C.el2Name(this), $C.EXCLUDEEXPCAT) < 0 ) {colCat.push($C.el2Name(this)); }});
	$.each($V.Budget.Summary.ExpSubCat, function () {if ($.inArray($C.el2Name(this), $C.EXCLUDEEXPCAT) < 0 ) {colCat.push($C.el2Name(this)); }});
	$.each($V.CarryOver.ExpSubCat, function(){colCat.push($C.el2Name(this));});
	
	//sort the exp cat's and map them back to their codes
	colCat = $.distinct(colCat).sort(function (x, y) {return x < y ? -1 : 1})	
	colCat = $.map(colCat, function(i) {return {name: $C.el2Name(i), code: $C.el2Code(i)}});    

	/*build actual dataset */
	var dMaxActual = 0;
	var dMaxBudget = 0;
	var colActualData = [];
	var colBudgetData = [];
	var colCarryOverData =  [];                      
    
	console.log('Computing Budget & Actual Summary');
	$.each(colCat, function () {
		var sCatName = this.name;
		var sCatCode = this.code;
		var colMatch = $.grep($V.Actual.Summary.Spend, function (i) {
				return i.Name == sCatName
			});
		var dAmt = colMatch.length > 0 ? colMatch[0].Amount : {
			y : 0,
			name : sCatName.toString()
		};
		colActualData.push(dAmt);
		if (dAmt.y > dMaxActual) {
			dMaxActual = dAmt.y
		}		
		
		var colBudgetMatch = $.grep($V.Budget.Summary.Amount, function (i) {return i.Name == sCatName;});					
		var dBTot =  {y : 0, name : sCatName.toString()};					
		if (colBudgetMatch.length > 0 ) {
			//console.log(sCatName + ": " + colBudgetMatch.length)
			dBTot = colBudgetMatch[0].Amount;
		}
		
		colBudgetData.push(dBTot);
		colCarryOverData.push($C.CarryOver(sCatCode));					
		if (dBTot.y > dMaxBudget) {
			dMaxBudget = dBTot.y
		}
	});

	
    return {
		/* zoom to relative level */
		yAxis : {
			max : (dMaxActual * 1.5) < dMaxBudget ? (dMaxActual * 1.5) : null
		},
		categories : colCat,
		series : [{
				name : 'Budget',
				color : colors[9],
				pointPadding : 0.0,
				data : colBudgetData, 
				stack: 'budget'
			}, {
				name: 'Carry Over',
				color: colors[7],
				pointPadding: 0.0,
				data: colCarryOverData,
				stack: 'budget'
			}, {
				name : 'Actual',
				color : colors[6],
				pointPadding : 0.15,
				data : colActualData,
				stack: 'actual'
			}
		]
	}

}

/* */
function DimensionClick(model,e) {
    $C.gridGroupClick(model,e, $(e.target).data().dimension);
    e.preventDefault();
    return false;
}

/*poor mans excel export  */
function ToExcel() {
	var sUrl = 'http://msusa-portal-uat/_layouts/com.mizuho.sharepoint.portal/mrhandler.ashx?get=ToExcel';
	var sHeaderRow = '<tr>' + $.map($V.Grid.colModel, function(i) {return '<th>' + i.label + '</th>'}).toString() + '</tr>'
	var sBodyHtml = $('#grid')[0].innerHTML;	
	var oTable = $('<table />');
	oTable.append(sHeaderRow);
	oTable.append(sBodyHtml);	
	var oPayload = $('<div />');
	oPayload.append(oTable);	
	$('#ToExcelForm').remove();
	var oForm = document.createElement('form');
	oForm.method = 'POST';
	oForm.action = sUrl;
	oForm.id = 'ToExcelForm';
	var oFileName = $('<input type="hidden">');
	oFileName.attr('id','XlsFileName');
	oFileName.attr('name','XlsFileName');
	oFileName.val('TheITBudgetDashboard.xls');
	var oFileConent = $('<input type="hidden" />');
	oFileConent.attr('id','XlsFileContent');
	oFileConent.attr('name','XlsFileContent');
	oFileConent.val(oPayload.html());
	$(oForm).append(oFileName);
	$(oForm).append(oFileConent)
	$('body').append(oForm)
	oForm.submit()
}
