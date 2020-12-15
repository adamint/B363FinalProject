package bioinformatics.yeast;

import bioinformatics.Motifs;
import bioinformatics.Utils;

import java.util.Arrays;
import java.util.List;

public class YeastFindCSRE {
    public static void main(String[] args) {
        String ybl043w = Utils.readResource("YBL043W.txt").replace("\n", "");
        String ybl045c = Utils.readResource("YBL045C.txt").replace("\n", "");
        String ybl049w = Utils.readResource("YBL049W.txt").replace("\n", "");
        List<String> list = Arrays.asList(ybl043w, ybl045c, ybl049w);

        for (int i = 5; i < 50; i++) {
            List<String> result = Motifs.gibbsSampler(list, i, list.size(), 100);
            System.out.println("Testing k of " + i);
            System.out.println(result);
            System.out.println(getPairwiseHammingsSum(result));
            System.out.println("=====");
        }
    }

    public static int getPairwiseHammingsSum(List<String> strings) {
        int sum = 0;
        for (int i = 0; i < strings.size(); i++) {
            for (int j = 0; j < strings.size(); j++) {
                if (i != j) sum += Motifs.calculateHammingDistance(strings.get(i), strings.get(j));
            }
        }
        return sum;
    }
}
