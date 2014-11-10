var examples = [
    {
        title: "Alternating Bit Protocol",
        ccs: "********************************\n" +
             "*** Alternating Bit Protocol ***\n" +
             "********************************\n" +
             "\n" +
             "* Sender\n" +
             "agent Send0 = acc.Sending0;\n" +
             "agent Sending0 = 'left0.Sending0 + leftAck0.Send1 + leftAck1.Sending0;\n" +
             "agent Send1 = acc.Sending1;\n" +
             "agent Sending1 = 'left1.Sending1 + leftAck1.Send0 + leftAck0.Sending1;\n" +
             "\n" +
             "* Receiver\n" +
             "agent Received0 = 'del.RecvAck1;\n" +
             "agent Received1 = 'del.RecvAck0;\n" +
             "agent RecvAck0 = right0.Received0 + right1.RecvAck0 + 'rightAck1.RecvAck0;\n" +
             "agent RecvAck1 = right1.Received1 + right0.RecvAck1 + 'rightAck0.RecvAck1;\n" +
             "\n" +
             "* Medium\n" +
             "agent Med = MedTop | MedBot;\n" +
             "agent MedBot = left0.MedBotRep0 + left1.MedBotRep1;\n" +
             "agent MedBotRep0 = 'right0.MedBotRep0 + tau.MedBot;\n" +
             "agent MedBotRep1 = 'right1.MedBotRep1 + tau.MedBot;\n" +
             "agent MedTop = rightAck0.MedTopRep0 + rightAck1.MedTopRep1;\n" +
             "agent MedTopRep0 = 'leftAck0.MedTopRep0 + tau.MedTop;\n" +
             "agent MedTopRep1 = 'leftAck1.MedTopRep1 + tau.MedTop;\n" +
             "\n" +
             "* Protocol and specification\n" +
             "set InternalComActs = {left0, left1, right0, right1, leftAck0, leftAck1, rightAck0, rightAck1};\n" +
             "agent Protocol = (Send0 | Med | RecvAck0) \\ InternalComActs;\n" +
             "agent Spec = acc.'del.Spec;"
    },
    {
        title: "Square Formation",
        ccs: "S1 = right.S2 + down.S3;\n" +
             "S2 = down.S4 + left.S1;\n" +
             "S3 = up.S1 + right.S4;\n" +
             "S4 = up.S2 + left.S3;"
    }
]
