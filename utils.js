function number_convert() {
    var number = document.getElementById('convert-origin-number').value;
    var base   = document.getElementById('convert-number-base').value;
    var resbase= document.getElementById('convert-result-base').value;

    var base_number = parseInt(base, 10);
    var result_base_number = parseInt(resbase, 10);
    var origin_number = parseInt(number, base_number);
    var result = origin_number.toString(result_base_number);

    document.getElementById('convert-result').innerHTML = result;
}