# 编码器 Verilog代码

## 3位二进制编码器

``` verilog
module encoder_8_3(
    input  wire A0, //最低位编码输入
    input  wire A1,
    input  wire A2,
    input  wire A3,
    input  wire A4,
    input  wire A5,
    input  wire A6,
    input  wire A7, //最高位编码输入
    output wire Y0, //最低位编码输出
    output wire Y1,
    output wire Y2  //最高位编码输出
);  //端口列表在()中
    //逻辑功能定义
    assign Y0 = ~ (A0 & A2 & A4 & A6);
    assign Y1 = ~ (A0 & A1 & A4 & A5);
    assign Y2 = ~ (A0 & A1 & A2 & A3);
endmodule
```

## 4线-2线优先编码器

``` verilog
module encoder_4_2_priority(
    input  wire A0, //最低位编码输入
    input  wire A1,
    input  wire A2,
    input  wire A3, //最高位编码输入
    output reg  Y0, //低位编码输出
    output reg  Y1, //高位编码输出
    output reg  E0  //使能输出
);  //端口列表在()中
    //逻辑功能定义
    always @ (A0, A1, A2, A3) begin
        if      ( A3 ) {Y1, Y0, E0} = 3'b111;
        else if ( A2 ) {Y1, Y0, E0} = 3'b101;
        else if ( A1 ) {Y1, Y0, E0} = 3'b011;
        else if ( A0 ) {Y1, Y0, E0} = 3'b001;
        else           {Y1, Y0, E0} = 3'b000;
    end
endmodule
```

## 8线-3线优先编码器 74LS148

使用 `if-else`

``` verilog
module m_74LS148_condition(
    input  wire I0, //输入最低位
    input  wire I1,
    input  wire I2,
    input  wire I3,
    input  wire I4,
    input  wire I5,
    input  wire I6,
    input  wire I7, //输入最高位
    input  wire EI, //输入使能
    output reg  A0, //输出编码低位
    output reg  A1, //输出编码中间位
    output reg  A2, //输出编码高位
    output reg  EO, //输出使能,高有效
    output reg  GS  //输出使能,低有效
);
    //逻辑功能定义
    always @ (EI, I0, I1, I2, I3, I4, I5, I6, I7) begin
        if      ( EI  ) {A2, A1, A0, GS, EO} = 5'b11111;
        else if ( ~I7 ) {A2, A1, A0, GS, EO} = 5'b00001;
        else if ( ~I6 ) {A2, A1, A0, GS, EO} = 5'b00101;
        else if ( ~I5 ) {A2, A1, A0, GS, EO} = 5'b01001;
        else if ( ~I4 ) {A2, A1, A0, GS, EO} = 5'b01101;
        else if ( ~I3 ) {A2, A1, A0, GS, EO} = 5'b10001;
        else if ( ~I2 ) {A2, A1, A0, GS, EO} = 5'b10101;
        else if ( ~I1 ) {A2, A1, A0, GS, EO} = 5'b11001;
        else if ( ~I0 ) {A2, A1, A0, GS, EO} = 5'b11101;
        else            {A2, A1, A0, GS, EO} = 5'b11110;
    end
endmodule
```

使用逻辑图

``` verilog
module m_74LS148_logic(
    input  wire I0, //输入最低位
    input  wire I1,
    input  wire I2,
    input  wire I3,
    input  wire I4,
    input  wire I5,
    input  wire I6,
    input  wire I7, //输入最高位
    input  wire EI, //输入使能
    output wire A0, //输出编码低位
    output wire A1, //输出编码中间位
    output wire A2, //输出编码高位
    output wire EO, //输出使能,高有效
    output wire GS  //输出使能,低有效
);
    // 线网类型
    wire I1n, I2n, I3n, I4n;
    wire I5n, I6n, I7n, EIn;
    wire I2nn, I4nn, I5nn, I6nn;
    wire I17_EIn;
    wire I7n_EIn;

    // 功能定义
    assign I1n = ~I1;
    assign I2n = ~I2;
    assign I3n = ~I3;
    assign I4n = ~I4;
    assign I5n = ~I5;
    assign I6n = ~I6;
    assign I7n = ~I7;
    assign EIn = ~EI;
    assign I2nn = ~I2n;
    assign I4nn = ~I4n;
    assign I5nn = ~I5n;
    assign I6nn = ~I6n;
    assign I7n_EIn = I7n & EIn;
    assign I17_EIn = ~(I1 & I2 & I3 & I0 & I4 & I5 & I6 & I7 & EIn);
    assign EO = I17_EIn;
    assign GS = ~(I17_EIn & EIn);
    assign A0 = ~((I1n & I2nn & I4nn & I6nn & EIn) |
                (I3n & I4nn & I6nn & EIn) | (EIn & I6nn & I5n) | I7n_EIn);
    assign A1 = ~((I2n & I4nn & I5nn & EIn) | (I3n & I4nn & I5nn & EIn) |
                (I6n & EIn) | (I7n & EIn));
    assign A2 = ~((I4n & EIn) | (I5n & EIn) | (I6n & EIn) | (I7n & EIn));
endmodule
```

## 二-十进制优先编码器

使用 `if-else`

``` verilog
module m_74LS147_condition(
    input  wire I1, //输入最低位
    input  wire I2,
    input  wire I3,
    input  wire I4,
    input  wire I5,
    input  wire I6,
    input  wire I7,
    input  wire I8,
    input  wire I9, //输入最高位
    output reg  A0, //输出编码最低位
    output reg  A1,
    output reg  A2,
    output reg  A3  //输出编码最高位
);
    //逻辑功能定义
    always @ (I1, I2, I3, I4, I5, I6, I7, I8, I9) begin
        if      ( ~I9 ) {A3, A2, A1, A0} = 4'b0110;
        else if ( ~I8 ) {A3, A2, A1, A0} = 4'b0111;
        else if ( ~I7 ) {A3, A2, A1, A0} = 4'b1000;
        else if ( ~I6 ) {A3, A2, A1, A0} = 4'b1001;
        else if ( ~I5 ) {A3, A2, A1, A0} = 4'b1010;
        else if ( ~I4 ) {A3, A2, A1, A0} = 4'b1011;
        else if ( ~I3 ) {A3, A2, A1, A0} = 4'b1100;
        else if ( ~I2 ) {A3, A2, A1, A0} = 4'b1101;
        else if ( ~I1 ) {A3, A2, A1, A0} = 4'b1110;
        else            {A3, A2, A1, A0} = 4'b1111;
    end
endmodule
```

使用逻辑图

``` verilog
module m_74LS147_logic(
    input  wire I1, //输入最低位
    input  wire I2,
    input  wire I3,
    input  wire I4,
    input  wire I5,
    input  wire I6,
    input  wire I7,
    input  wire I8,
    input  wire I9, //输入最高位
    output wire A0, //输出编码最低位
    output wire A1,
    output wire A2,
    output wire A3  //输出编码最高位
);
    // 线网类型
    wire I1n, I2n, I3n, I4n, I5n;
    wire I6n, I7n, I8n, I9n;
    wire I2nn, I4nn, I5nn, I6nn, I89n;

    // 功能定义
    assign I1n = ~I1;
    assign I2n = ~I2;
    assign I3n = ~I3;
    assign I4n = ~I4;
    assign I5n = ~I5;
    assign I6n = ~I6;
    assign I7n = ~I7;
    assign I8n = ~I8;
    assign I9n = ~I9;
    assign I2nn = ~I2n;
    assign I4nn = ~I4n;
    assign I5nn = ~I5n;
    assign I6nn = ~I6n;
    assign I89n = ~(I8n | I9n);
    assign A0 = ~((I1n & I2nn & I4nn & I1n & I6nn & I89n) |
                (I3n & I4nn & I6nn & I89n) | (I89n & I6nn & I5n) |
                (I7n & I89n) | I9n);
    assign A1 = ~((I2n & I4nn & I5nn & I89n) | (I3n & I4nn & I5nn & I89n) |
                (I6n & I89n) | (I7n & I89n));
    assign A2 = ~((I4n & I89n) | (I5n & I89n) | (I6n & I89n) | (I7n & I89n));
    assign A3 = ~(I8n | I9n);
endmodule
```