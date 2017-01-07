//Global vars
var cadInitBal = 10000000;
var usdInitBal = 10000000;
var eurInitBal = 10000000;

var mainController = (function (){
    $(function(){
        $("#cadBal").text(cadInitBal);
        $("#usdBal").text(usdInitBal);
        $("#eurBal").text(eurInitBal);
        }
    );

    return{
        calcuateBal: function(cur, change){
            return parseFloat(cur) + parseFloat(change);
        },
        updateBal: function(setCur, changeAmt){
            switch(setCur) {
                case "CAD":
                    var curCadBal=$("#cadBal").text();
                    $("#cadBal").text(mainController.calcuateBal(curCadBal,changeAmt));
                    break;
                case "USD":
                    var curUsdBal=$("#usdBal").text();
                    $("#usdBal").text(mainController.calcuateBal(curUsdBal,changeAmt));
                    break;
                case "EUR":
                    var curEurBal=$("#eurBal").text();
                    $("#eurBal").text(mainController.calcuateBal(curEurBal,changeAmt));
                    break;
                default:
                    break;
            }
        }
    }
})();