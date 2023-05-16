# 好用工具

## 进制转换

原&emsp;&emsp;数：<input id='convert-origin-number'> <br/>
原数进制：<input id='convert-number-base'> <br/>
结果进制：<input id='convert-result-base'> <br/>
<button onclick=number_convert() > convert </button> <br/>
结果：<span id='convert-result'> </span>

<script>
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
</script>