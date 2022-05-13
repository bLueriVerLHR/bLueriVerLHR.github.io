# 译码器 Verilog代码

## 3线-8线译码器 74LS138

``` verilog
module m_74LS138_condition(
    input  wire G1,  //输入使能高有效
    input  wire G2A, //输入使能低有效
    input  wire G2B, //输入使能低有效
    input  wire C,   //输入高位
    input  wire B,
    input  wire A,   //输入低位
    output reg  Y0,  //输出最低位
    output reg  Y1,
    output reg  Y2,
    output reg  Y3,
    output reg  Y4,
    output reg  Y5,
    output reg  Y6,
    output reg  Y7   //输出最高位
);
    //功能描述
    always @( G1, G2A, G2B, C, B, A ) begin
        if( G1 & ~G2A & ~G2B )
            case({ C, B, A })
                3'b000: { Y0, Y1, Y2, Y3, Y4, Y5, Y6, Y7 } = 8'b01111111;
                3'b001: { Y0, Y1, Y2, Y3, Y4, Y5, Y6, Y7 } = 8'b10111111;
                3'b010: { Y0, Y1, Y2, Y3, Y4, Y5, Y6, Y7 } = 8'b11011111;
                3'b011: { Y0, Y1, Y2, Y3, Y4, Y5, Y6, Y7 } = 8'b11101111;
                3'b100: { Y0, Y1, Y2, Y3, Y4, Y5, Y6, Y7 } = 8'b11110111;
                3'b101: { Y0, Y1, Y2, Y3, Y4, Y5, Y6, Y7 } = 8'b11111011;
                3'b110: { Y0, Y1, Y2, Y3, Y4, Y5, Y6, Y7 } = 8'b11111101;
                3'b111: { Y0, Y1, Y2, Y3, Y4, Y5, Y6, Y7 } = 8'b11111110;
            endcase
        else
            { Y0, Y1, Y2, Y3, Y4, Y5, Y6, Y7 } = 8'b11111111;
    end
endmodule
```

使用逻辑图

``` verilog
module m_74LS138_logic(
    input  wire G2A, //使能低有效
    input  wire G2B, //使能低有效
    input  wire G1,  //使能低有效
    input  wire A,   //输入低位
    input  wire B,
    input  wire C,   //输入高位
    output wire Y7, //输出高位
    output wire Y6,
    output wire Y5,
    output wire Y4,
    output wire Y3,
    output wire Y2,
    output wire Y1,
    output wire Y0  //输出低位
);
    // 线网类型
    wire An, Bn, Cn, G1n;
    wire Ann, Bnn, Cnn, GEn;

    // 功能定义
    assign An = ~A;
    assign Bn = ~B;
    assign Cn = ~C;
    assign Cnn = ~Cn;
    assign Bnn = ~Bn;
    assign Ann = ~An;
    assign G1n = ~G1;
    assign GEn = ~(G1n | G2B | G2A);
    assign Y0 = ~(An & Bn & Cn & GEn);
    assign Y1 = ~(Ann & Bn & Cn & GEn);
    assign Y2 = ~(An & Bnn & Cn & GEn);
    assign Y3 = ~(Ann & Bnn & Cn & GEn);
    assign Y4 = ~(An & Bn & Cnn & GEn);
    assign Y5 = ~(Bn & Cnn & Ann & GEn);
    assign Y6 = ~(An & Cnn & Bnn & GEn);
    assign Y7 = ~(GEn & Bnn & Ann & Cnn);
endmodule
```

## 74LS138级联的74LS154

``` verilog
module m_74LS154_138s(
    input  wire G1, //使能输入
    input  wire G2, //使能输入
    input  wire D,  //输入最高位
    input  wire C,
    input  wire B,
    input  wire A,  //输入最低位
    output wire Y0, //输出最低位
    output wire Y1,
    output wire Y2,
    output wire Y3,
    output wire Y4,
    output wire Y5,
    output wire Y6,
    output wire Y7,
    output wire Y8,
    output wire Y9,
    output wire Y10,
    output wire Y11,
    output wire Y12,
    output wire Y13,
    output wire Y14,
    output wire Y15  //输出最高位
);
    //线网类型
    wire W1;

    //功能说明
    assign W1 = ~D; //例化2个74138
    m_74LS138_$mode$ u0(
        .G1(W1),
        .G2A(G1),
        .G2B(G2),
        .C(C),
        .B(B),
        .A(A),
        .Y0(Y0),
        .Y1(Y1),
        .Y2(Y2),
        .Y3(Y3),
        .Y4(Y4),
        .Y5(Y5),
        .Y6(Y6),
        .Y7(Y7)
    );
    m_74LS138_$mode$ u1(
        .G1(D),
        .G2A(G1),
        .G2B(G2),
        .C(C),
        .B(B),
        .A(A),
        .Y0(Y8),
        .Y1(Y9),
        .Y2(Y10),
        .Y3(Y11),
        .Y4(Y12),
        .Y5(Y13),
        .Y6(Y14),
        .Y7(Y15)
    );
endmodule
```

## 二-十进制译码器

``` verilog
module m_74LS42_condition(
    input  wire D,  //输入最高位
    input  wire C,
    input  wire B,
    input  wire A,  //输入最低位
    output reg  Y0, //输出最低位
    output reg  Y1,
    output reg  Y2,
    output reg  Y3,
    output reg  Y4,
    output reg  Y5,
    output reg  Y6,
    output reg  Y7,
    output reg  Y8,
    output reg  Y9  //输出最高位
);
    //逻辑功能定义
    always @ ( D, C, B, A ) begin
        case({ D, C, B, A })
            4'b0000: {Y0, Y1, Y2, Y3, Y4, Y5, Y6, Y7, Y8, Y9} = 10'b0111111111;
            4'b0001: {Y0, Y1, Y2, Y3, Y4, Y5, Y6, Y7, Y8, Y9} = 10'b1011111111;
            4'b0010: {Y0, Y1, Y2, Y3, Y4, Y5, Y6, Y7, Y8, Y9} = 10'b1101111111;
            4'b0011: {Y0, Y1, Y2, Y3, Y4, Y5, Y6, Y7, Y8, Y9} = 10'b1110111111;
            4'b0100: {Y0, Y1, Y2, Y3, Y4, Y5, Y6, Y7, Y8, Y9} = 10'b1111011111;
            4'b0101: {Y0, Y1, Y2, Y3, Y4, Y5, Y6, Y7, Y8, Y9} = 10'b1111101111;
            4'b0110: {Y0, Y1, Y2, Y3, Y4, Y5, Y6, Y7, Y8, Y9} = 10'b1111110111;
            4'b0111: {Y0, Y1, Y2, Y3, Y4, Y5, Y6, Y7, Y8, Y9} = 10'b1111111011;
            4'b1000: {Y0, Y1, Y2, Y3, Y4, Y5, Y6, Y7, Y8, Y9} = 10'b1111111101;
            4'b1001: {Y0, Y1, Y2, Y3, Y4, Y5, Y6, Y7, Y8, Y9} = 10'b1111111110;
            default: {Y0, Y1, Y2, Y3, Y4, Y5, Y6, Y7, Y8, Y9} = 10'b1111111111;
        endcase
    end
endmodule
```

使用逻辑图

``` verilog
module m_74LS42_logic(
    input  wire A,  //输入最低位
    input  wire B,
    input  wire C,
    input  wire D,  //输入最高位
    output wire Y0, //输出最低位
    output wire Y1,
    output wire Y2,
    output wire Y3,
    output wire Y4,
    output wire Y5,
    output wire Y6,
    output wire Y7,
    output wire Y8,
    output wire Y9  //输出最高位
);
    // 线网类型
    wire An, Bn, Cn, Dn;
    wire Ann, Bnn, Cnn, Dnn;

    // 逻辑功能定义
    assign An = ~A;
    assign Bn = ~B;
    assign Cn = ~C;
    assign Dn = ~D;
    assign Ann = ~An;
    assign Bnn = ~Bn;
    assign Cnn = ~Cn;
    assign Dnn = ~Dn;
    assign Y0 = ~( An & Bn & Cn & Dn );
    assign Y1 = ~( Ann & Bn & Cn & Dn );
    assign Y2 = ~( An & Bnn & Cn & Dn );
    assign Y3 = ~( Ann & Bnn & Cn & Dn );
    assign Y4 = ~( An & Bn & Cnn & Dn );
    assign Y5 = ~( Ann & Bn & Cnn & Dn );
    assign Y6 = ~( An & Bnn & Cnn & Dn );
    assign Y7 = ~( Ann & Bnn & Cnn & Dn );
    assign Y8 = ~( An & Bn & Cn & Dnn );
    assign Y9 = ~( Ann & Bn & Cn & Dnn );
endmodule
```

## 共阴7段数码管译码器74LS48

``` verilog
module m_74LS48_condition(
    input  wire LT,  //试灯输入
    input  wire BI,  //灭灯输入
    input  wire RBI, //灭零输入
    input  wire D,   //输入最高位
    input  wire C,
    input  wire B,
    input  wire A,   //输入最低位
    output wire a,  //输出段位
    output wire b,
    output wire c,
    output wire d,
    output wire e,
    output wire f,
    output wire g,  //输出段位
    output wire RBO //灭零输出
);
    reg [0:7] seg_out;
    assign {a, b, c, d, e, f, g, RBO} = seg_out;
    always @ (LT, BI, RBI, D, C, B, A) begin
        if (LT == 0) seg_out = 8'b11111111;
        else if ( BI == 0) seg_out = 8'b00000000;
        else if ( RBI == 0 && {D, C, B, A} == 4'b0000 )
            seg_out = 8'b00000000;
        else case ({D, C, B, A})
            4'b0000: seg_out = 8'b11111101; //显示"0"
            4'b0001: seg_out = 8'b01100001; //显示"1"
            4'b0010: seg_out = 8'b11011011; //显示"2"
            4'b0011: seg_out = 8'b11110011; //显示"3"
            4'b0100: seg_out = 8'b01100111; //显示"4"
            4'b0101: seg_out = 8'b10110111; //显示"5"
            4'b0110: seg_out = 8'b00111111; //显示"6"
            4'b0111: seg_out = 8'b11100001; //显示"7"
            4'b1000: seg_out = 8'b11111111; //显示"8"
            4'b1001: seg_out = 8'b11100111; //显示"9"
            4'b1010: seg_out = 8'b00011011;
            4'b1011: seg_out = 8'b00110011;
            4'b1100: seg_out = 8'b01000111;
            4'b1101: seg_out = 8'b10010111;
            4'b1110: seg_out = 8'b00011111;
            4'b1111: seg_out = 8'b00000001;
            default: seg_out = 8'b00000001;
        endcase
    end
endmodule
```

使用逻辑图

``` verilog
module m_74LS48_logic(
    input  wire D,
    input  wire C,
    input  wire B,
    input  wire A,
    input  wire BI,
    input  wire LT,
    input  wire RBI,
    output wire RBO,
    output wire out_a,
    output wire out_b,
    output wire out_c,
    output wire out_d,
    output wire out_e,
    output wire out_f,
    output wire out_g
);
    wire SA, SB, SC, SD, SR;
    assign RBO = SR;
    assign SA = ~(~(A & LT) & BI & SR);
    assign SB = ~(~(B & LT) & BI & SR);
    assign SC = ~(~(C & LT) & BI & SR);
    assign SD = ~(~D & BI & SR);
    assign SR = ~(~(B & LT) & ~(C & LT) & ~D & ~(A & LT) & ~RBI & LT);
    assign out_a = ~(SB & SD | SA & ~(B & LT) & ~(C & LT) & ~D | ~(A & LT) & SC);
    assign out_b = ~(SB & SD | SC & SB & ~(A & LT) | SC & ~(B & LT) & SA);
    assign out_c = ~(SC & SD | ~(C & LT) & SB & ~(A & LT));
    assign out_d = ~(~(C & LT) & ~(B & LT) & SA | SC & SB & SA | SC & ~(B & LT) & ~(A & LT));
    assign out_e = ~(SA | ~(B & LT) & SC);
    assign out_f = ~(SA & SB | ~D & ~(C & LT) & SA | SB & ~(C & LT));
    assign out_g = ~(SC & SB & SA | ~(B & LT) & ~(C & LT) & ~D & LT);
endmodule
```

## 共阳7段数码管译码器74LS47

``` verilog
module m_74LS47_condition(
    input  wire LT,  //试灯输入
    input  wire BI,  //灭灯输入
    input  wire RBI, //灭零输入
    input  wire D,   //输入最高位
    input  wire C,
    input  wire B,
    input  wire A,   //输入最低位
    output wire an, //输出段位
    output wire bn,
    output wire cn,
    output wire dn,
    output wire en,
    output wire fn,
    output wire gn, //输出段位
    output wire RBO //灭零输出
);
    reg [0:7] seg_out;
    assign {an, bn, cn, dn, en, fn, gn, RBO} = seg_out;
    always @ (LT, BI, RBI, D, C, B, A) begin
        if (LT == 0) seg_out = 8'b00000001;
        else if ( BI == 0) seg_out = 8'b11111110;
        else if ( RBI == 0 && {D, C, B, A} == 4'b0000 )
            seg_out = 8'b11111110;
        else case ({D, C, B, A})
            4'b0000: seg_out = 8'b00000011; //显示"0"
            4'b0001: seg_out = 8'b10011111; //显示"1"
            4'b0010: seg_out = 8'b00100101; //显示"2"
            4'b0011: seg_out = 8'b00001101; //显示"3"
            4'b0100: seg_out = 8'b10011001; //显示"4"
            4'b0101: seg_out = 8'b01001001; //显示"5"
            4'b0110: seg_out = 8'b11000001; //显示"6"
            4'b0111: seg_out = 8'b00011111; //显示"7"
            4'b1000: seg_out = 8'b00000001; //显示"8"
            4'b1001: seg_out = 8'b00011001; //显示"9"
            4'b1010: seg_out = 8'b11100101;
            4'b1011: seg_out = 8'b11001101;
            4'b1100: seg_out = 8'b10111001;
            4'b1101: seg_out = 8'b01101001;
            4'b1110: seg_out = 8'b11100001;
            4'b1111: seg_out = 8'b11111111;
            default: seg_out = 8'b11111111;
        endcase
    end
endmodule
```

使用逻辑图

``` verilog
module m_74LS47_logic(
    input  wire LT,
    input  wire BI,
    input  wire RBI,
    input  wire D,
    input  wire C,
    input  wire B,
    input  wire A,
    output wire an,
    output wire bn,
    output wire cn,
    output wire dn,
    output wire en,
    output wire fn,
    output wire gn,
    output wire RBO
);
    wire A_BIn, B_BIn, C_BIn, D_BIn, BI_RBO;
    assign RBO = BI_RBO;
    assign A_BIn = ~(~(A & LT) & BI & BI_RBO);
    assign B_BIn = ~(~(B & LT) & BI & BI_RBO);
    assign C_BIn = ~(~(C & LT) & BI & BI_RBO);
    assign D_BIn = ~(~D & BI & BI_RBO);
    assign BI_RBO = ~(~(B & LT) & ~(C & LT) & ~D & ~(A & LT)&(~RBI)& LT);
    assign an = (B_BIn & D_BIn) | (A_BIn & ~(B & LT) & ~(C & LT)& ~D) | (~(A & LT)& C_BIn);
    assign bn = (B_BIn & D_BIn) | (C_BIn & B_BIn & ~(A & LT)) | (C_BIn & ~(B & LT)& A_BIn);
    assign cn = (C_BIn & D_BIn) | (~(C & LT) & B_BIn & ~(A & LT));
    assign dn = (~(C & LT)& ~(B & LT)& A_BIn) | (C_BIn & B_BIn & A_BIn) | (C_BIn & ~(B & LT)&~(A & LT));
    assign en = A_BIn | (~(B & LT)& C_BIn);
    assign fn = (A_BIn & B_BIn) | (~D & ~(C & LT) & A_BIn) | (B_BIn & ~(C & LT));
    assign gn = (C_BIn & B_BIn & A_BIn) | (~(B & LT) & ~(C & LT)& ~D & LT);
endmodule
```

## 共阳7段数码管显示译码器现实十六进制数码输出

``` verilog
module SK4_3_1(
    input  wire A3, //输入最高位
    input  wire A2,
    input  wire A1,
    input  wire A0, //输入最低位
    input  wire [0:7] SW, //8位共阳输入
    output wire [0:7] AN, //8位数码管
    output wire an, //输出段位
    output wire bn,
    output wire cn,
    output wire dn,
    output wire en,
    output wire fn,
    output wire gn //输出段位
);
    reg [0:6] seg_out;
    assign AN = SW;
    assign {an, bn, cn, dn, en, fn, gn} = seg_out;
    always @ (A3, A2, A1, A0) begin
        case ({A3, A2, A1, A0})
            4'b0000: seg_out = 7'b0000001; //显示"0"
            4'b0001: seg_out = 7'b1001111; //显示"1"
            4'b0010: seg_out = 7'b0010010; //显示"2"
            4'b0011: seg_out = 7'b0000110; //显示"3"
            4'b0100: seg_out = 7'b1001100; //显示"4"
            4'b0101: seg_out = 7'b0100100; //显示"5"
            4'b0110: seg_out = 7'b0100000; //显示"6"
            4'b0111: seg_out = 7'b0001111; //显示"7"
            4'b1000: seg_out = 7'b0000000; //显示"8"
            4'b1001: seg_out = 7'b0001100; //显示"9"
            4'b1010: seg_out = 7'b0001000; //显示"A"
            4'b1011: seg_out = 7'b1100000; //显示"b"
            4'b1100: seg_out = 7'b1110010; //显示"c"
            4'b1101: seg_out = 7'b1000010; //显示"d"
            4'b1110: seg_out = 7'b0110000; //显示"E"
            4'b1111: seg_out = 7'b0111000; //显示"F"
            default: seg_out = 7'b1111111; //显示" "
        endcase
    end
endmodule
```