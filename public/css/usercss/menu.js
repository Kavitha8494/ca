
$(document).ready(function () {
    try {
        document.getElementById('RadDockZone2').innerHTML = "<div class='row'>  " + document.getElementById('RadDockZone2').innerHTML + " </div>";

        document.getElementById('RadDockZone1').innerHTML = "<div class='row'>  " + document.getElementById('RadDockZone1').innerHTML + " </div>";
        document.getElementById('RadDockZone3').innerHTML = "<div class='row'>  " + document.getElementById('RadDockZone3').innerHTML + " </div>";
    }
    catch (e) {
    }
    $('ul.dropdown-menu [data-toggle=dropdown]').on('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        $(this).parent().siblings().removeClass('open');
        $(this).parent().toggleClass('open');
    });




});