# 加法器 Verilog代码

这里约定使用 `$mode$` 作为自主选择部分，代码会为了统一接口名称做出一些取舍。

## 1位全加器

``` verilog
module full_adder(
    input  Ai,
    input  Bi,
    input  Ci,
    output Si,
    output Ciout
);
    assign Si = Ai ^ Bi ^ Ci;
    assign Ciout = Ai & Bi | (Ai ^ Bi) & Ci;
endmodule
```

## 串行进位4位并行全加器

``` verilog
module full_adder_4_serial(
    input  wire C0,
    input  wire [3:0] A,
    input  wire [3:0] B,
    output wire [3:0] S,
    output wire C4
);
    wire C1, C2, C3;
    full_adder fa1(
        .Ci(C0),
        .Ai(A[0]),
        .Bi(B[0]),
        .Si(S[0]),
        .Ciout(C1)
    );
    full_adder fa2(
        .Ci(C1),
        .Ai(A[1]),
        .Bi(B[1]),
        .Si(S[1]),
        .Ciout(C2)
    );
    full_adder fa3(
        .Ci(C2),
        .Ai(A[2]),
        .Bi(B[2]),
        .Si(S[2]),
        .Ciout(C3)
    );
    full_adder fa4(
        .Ci(C3),
        .Ai(A[3]),
        .Bi(B[3]),
        .Si(S[3]),
        .Ciout(C4)
    );
endmodule
```

## 超前进位4位并行全加器

``` verilog
module full_adder_4_parallel(
    input  wire C0,
    input  wire [3:0] A,
    input  wire [3:0] B,
    output wire [3:0] S,
    output wire C4
);
    wire P0, P1, P2, P3;
    wire G0, G1, G2, G3;
    wire C1, C2, C3;
    assign G0 = A[0] & B[0];
    assign G1 = A[1] & B[1];
    assign G2 = A[2] & B[2];
    assign G3 = A[3] & B[3];

    assign P0 = A[0] | B[0];
    assign P1 = A[1] | B[1];
    assign P2 = A[2] | B[2];
    assign P3 = A[3] | B[3];

    assign C1 = G0 | (C0 & P0);
    assign C2 = G1 | (G0 & P1) | (C0 & P0 & P1);
    assign C3 = G2 | (G1 & P2) | (G0 & P1 & P2) | (C0 & P0 & P1 & P2);
    assign C4 = G3 | (G2 & P3) | (G1 & P2 & P3) | (G0 & P1 & P2 & P3)
                | (C0 & P0 & P1 & P2 & P3);

    assign S[0] = C0 ^ A[0] ^ B[0];
    assign S[1] = C1 ^ A[1] ^ B[1];
    assign S[2] = C2 ^ A[2] ^ B[2];
    assign S[3] = C3 ^ A[3] ^ B[3];
endmodule
```

## 4位全加器级联的8位全加器

``` verilog
module full_adder_8_4s(
    input  wire Cl,
    input  wire [7:0] A,
    input  wire [7:0] B,
    output wire [7:0] S,
    output wire Ch
);
    wire C1;
    full_adder_4_$mode$ fa41(
        .C0(Cl),
        .A(A[3:0]),
        .B(B[3:0]),
        .S(S[3:0]),
        .C4(C1)
    );
    full_adder_4_$mode$ fa42(
        .C0(C1),
        .A(A[7:4]),
        .B(B[7:4]),
        .S(S[7:4]),
        .C4(Ch)
    );
endmodule
```

## 1位全加器级联的8位全加器

也即**串行进位八位并行全加器**

``` verilog
module full_adder_8_serial(
    input  wire Cl,
    input  wire [7:0] A,
    input  wire [7:0] B,
    output wire [7:0] S,
    output wire Ch
);
    wire C1, C2, C3, C4, C5, C6, C7;
    full_adder fa1(
        .Ci(Cl),
        .Ai(A[0]),
        .Bi(B[0]),
        .Si(S[0]),
        .Ciout(C1)
    );
    full_adder fa2(
        .Ci(C1),
        .Ai(A[1]),
        .Bi(B[1]),
        .Si(S[1]),
        .Ciout(C2)
    );
    full_adder fa3(
        .Ci(C2),
        .Ai(A[2]),
        .Bi(B[2]),
        .Si(S[2]),
        .Ciout(C3)
    );
    full_adder fa4(
        .Ci(C3),
        .Ai(A[3]),
        .Bi(B[3]),
        .Si(S[3]),
        .Ciout(C4)
    );
    full_adder fa5(
        .Ci(C4),
        .Ai(A[4]),
        .Bi(B[4]),
        .Si(S[4]),
        .Ciout(C5)
    );
    full_adder fa6(
        .Ci(C5),
        .Ai(A[5]),
        .Bi(B[5]),
        .Si(S[5]),
        .Ciout(C6)
    );
    full_adder fa7(
        .Ci(C6),
        .Ai(A[6]),
        .Bi(B[6]),
        .Si(S[6]),
        .Ciout(C7)
    );
    full_adder fa8(
        .Ci(C7),
        .Ai(A[7]),
        .Bi(B[7]),
        .Si(S[7]),
        .Ciout(Ch)
    );
endmodule
```

## 舍去最高位进位的8位求补码运算

``` verilog
module get_complement_8(
    input  wire sign,     // 低电平是正数，高电平为负数
    input  wire [7:0] In,
    output wire [7:0] Out   // 输出8位，最高位截断
);
    wire left_out;  // 忽略最高位，第9位
    wire reverse;
    wire [7:0] T;
    assign reverse = sign ? ~In : In;
    assign T = 8'b0000_0000;    // 接地
    full_adder_8_$mode$ fa81(
        .Cl(sign),
        .A(In),
        .B(T),
        .S(Out),
        .Ch(left_out)
    );
endmodule
```

## 自定义的带符号8位并行全加器

- 当符号位都为低电平的时候，属于两个无符号整数相加，最高位是表示进位。
- 当符号位有高电平的时候，属于两个有符号整数相加，最高位表示符号。

``` verilog
module full_adder_8_signed(
    input  wire sign_A,
    input  wire sign_B,
    input  wire C0,
    input  wire [7:0] A,
    input  wire [7:0] B,
    output wire [7:0] S,
    output wire Cout
);
    wire C1, sign_S;
    wire [7:0] Ac;
    wire [7:0] Bc;
    wire [7:0] Sc;

    // 获取A的补码
    get_complement_8 gc8A(
        .sign(sign_A),
        .In(A),
        .Out(Ac)
    );

    // 获取B的补码
    get_complement_8 gc8B(
        .sign(sign_B),
        .In(B),
        .Out(Bc)
    );

    // 补码相加
    full_adder_8_$mode$ fa81(
        .Cl(C0),
        .A(Ac),
        .B(Bc),
        .S(Sc),
        .Ch(C1)
    );

    // 判断最高位，第9位样子
    assign sign_S = (~C1 & (sign_A | sign_B)) | (sign_A & sign_B);
    assign Cout = sign_S | (~sign_A & ~sign_B & C1);

    // 返回结果的补码，方便观察输出，如果不期望这样，可以直接输出Sc
    get_complement_8 gc8S(
        .sign(sign_S),
        .In(Sc),
        .Out(S)
    );
endmodule
```