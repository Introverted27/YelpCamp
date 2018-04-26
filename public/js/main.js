$(".pwdbtn").click(function(){
  if ($(".pwd").attr("type")=="password") {
    $(".tooltip-inner").text("Hide Password")
    $(".pwd").attr("type", "text");
    $(this).css("color", "steelblue");

  } else {
    $(".tooltip-inner").text("Show Password")
    $(".pwd").attr("type", "password");
    $(this).css("color", "black");
  }
});

$(function () {
  $('[data-toggle="tooltip"]').tooltip()
})
