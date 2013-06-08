///reference index.js

function drawGrid() {
    $V.Grid = {};

	var colGridData = GetGridData(); 
	
	$.each($V.CarryOver, function() {
		colGridData.push({
			InvoiceId: this.SharePoint_x0020_Invoice.length ? this.SharePoint_x0020_Invoice.toString().split('-')[1] : null,
			Budgeted: 'Carry Over',
			amount: isNaN(this.To_x0020_be_x0020_expensed_x0020) ? 0 : this.To_x0020_be_x0020_expensed_x0020,
			el1: this.Title,
			el1Name: $C.el1Name(this.Title),
			el2: this.NEW_x0020_EL2,
			el2Name: $C.el2Name(this.NEW_x0020_EL2),
			el2BookAs: this.NEW_x0020_EL2,
			el2BookAsName: $C.el2Name(this.NEW_x0020_EL2),
			el4: this.El_x0020_4,
			el4Name: $C.el4Name(this.El_x0020_4),
			InvoiceIdValue: this.Vendor
		});
	});
	$V.Actual.Summary.Budgeted.push('Carry Over');	


    
    var colInvoiceId = []; 
    var colInvoiceIdValue = [];
    var colItTeam = [];
    var sExpCatOpt = ':All';
    $.each($V.Actual.FilteredData, function() {        
        if (  $.inArray(this.ITDepartment, colItTeam) < 0 ) { colItTeam.push(this.ITDepartment); }
        if (  $.inArray(this.InvoiceIdValue, colInvoiceIdValue) < 0 ) { colInvoiceIdValue.push(this.InvoiceIdValue); }
        if (  $.inArray(this.ITDepartment, colInvoiceId) < 0 ) { colInvoiceId.push(this.Id); }
        
    	if ( $.inArray($C.el2Name(this.el2), $C.EXCLUDEEXPCAT) <0 ) {
            var sExpCatKey = ';' + this.el2 + ':' + $C.el2Name(this.el2);
            if ( sExpCatOpt.indexOf(sExpCatKey) < 0) {
			    sExpCatOpt += sExpCatKey;
            }
		}        
    });
    
    colItTeam = $.distinct(colItTeam);
    colInvoiceIdValue = $.distinct(colInvoiceIdValue);
    colInvoiceId = $.distinct(colInvoiceId);

	$V.Grid.colModel = [{
			label : 'Invoice',
			name : 'InvoiceId',
			index : 'InvoiceId',
			search : true,
			stype : 'select',
			searchoptions : {
				sopt : ['eq'],
				value : $C.sOptValStr(colInvoiceId)
			}
		}, 
		{
			label : 'Invoice ID',
			name : 'InvoiceIdValue',
			index : 'InvoiceIdValue',
			search : true,
			stype : 'select',
			searchoptions : {
				sopt : ['eq'],
				value : $C.sOptValStr(colInvoiceIdValue)
			}
		},	
		{
			label : 'IT Dept',
			name : 'ITDepartment',
			index : 'ITDepartment',
			search : true,
			stype : 'select',
			searchoptions : {
				sopt : ['eq'],
				value : $C.sOptValStr(colItTeam)
			}
		},
        {
          label: 'Description',
          name: 'InvoiceIdDesc',
          index: 'InvoiceIdDesc'
        },
		{
			label : 'Expense Category',
			name : 'el2',
			index : 'el2',
			formatter : function (val) {
				return $C.el2Name(val)
			},
			stype : 'select',
			searchoptions : {
				sopt : ['eq'],
				value : sExpCatOpt
			}
		}, {
			label : 'Project',
			name : 'projectName',
			index : 'projectName',
			stype : 'select',
			searchoptions : {
				sopt : ['eq'],
				value : $C.sOptValStr($V.Actual.Summary.Project)
			}
		}, {
    		label : 'Recurring',
			name : 'Recurring',
			index : 'Recurring',
			stype : 'select',
            width: 70,
            formatter: function(val) { return val == 'Yes' ? '<i title="Recurring" class="icon icon-refresh"></i>' : '<i title="Non-Recurring" class="icon icon-minus"></i>'},
			searchoptions : {
				sopt : ['eq'],
				value : $C.sOptValStr($V.Actual.Summary.Recurring)
			}
		}, {
			label : 'Division',
			name : 'el1Name',
			index : 'el1Name',
			stype : 'select',
			searchoptions : {
				sopt : ['eq'],
				value : $C.sOptValStr($V.Actual.Summary.Division)
			}
		}, {
			label : 'Department',
			name : 'el4Name',
			index : 'el4Name',
			stype : 'select',
			searchoptions : {
				sopt : ['eq'],
				value : $C.sOptValStr($V.Actual.Summary.Department)
			}
		}, {
			label : 'Budgeted',
			name : 'Budgeted',
			index : 'Budgeted',
			stype : 'select',
			searchoptions : {
				sopt : ['eq'],
				value : $C.sOptValStr($V.Actual.Summary.Budgeted)
			}
		}, {
			label : 'Amount',
			name : 'amount',
			index : 'amount',
			align : 'right',
			formatter : function(val) { return Math.round(val*100)/100; },
			summaryType : 'sum',
			summaryTpl: '{0}',
			search : false
		}
	];

	grid = $("#grid").jqGrid({
			datatype : 'local',
			data : colGridData,
			//treeGrid : false,
			//autowidth : true,
			//shrinkToFit : true,
			height : 'auto',
			colModel : $V.Grid.colModel,
			multiselect : false,
			gridview : true,
			viewrecords : true,
			//toppager : true,			
			rowNum : colGridData.length,
			grouping : true,
			groupingView : {
				groupField : ['el2'],
				groupOrder : ['asc','asc','asc','asc'], 
				groupSummary : [true],
				showSummaryOnHide : true,
				groupCollapse : true		
			},
			ondblClickRow : function (rowid, iRow, iCol, e) {
				openInvoice(grid.getRowData(rowid).InvoiceId);
			},
			caption : "Actual Spend Detail"
		});

	grid.navGrid('#gpager', {
		caption:"Export to CSV", buttonicon:"ui-icon", onClickButton:ToExcel,
		edit : false,
		add : false,
		del : false
	});
	grid.filterToolbar({
		autosearch : true
	});
	
	/*highlight the exp cat group by button */
	$('#groupExCat').addClass('btn-info');
}