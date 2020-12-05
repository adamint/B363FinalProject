package bioinformatics;

import org.apache.commons.io.IOUtils;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.nio.charset.Charset;

public class Utils {
    public static class Pair<K, V> {
        private K k;
        private V v;

        public Pair(K k, V v) {
            this.k = k;
            this.v = v;
        }

        public K getK() {
            return k;
        }

        public V getV() {
            return v;
        }

        public static <K, V> Pair<K, V> of(K k, V v) {
            return new Pair<>(k, v);
        }

        @Override
        public String toString() {
            return "Pair(k=" + k + ", v=" + v + ")";
        }
    }

    public static double logBase2(double input) {
        if (input == 0.0) return 0;
        else return Math.log10(input) / Math.log10(2);
    }

    public static String readResource(String path) {
        try {
            return IOUtils.toString(new FileInputStream(new File(ClassLoader.getSystemResource(path).getFile())), Charset.defaultCharset());
        } catch (IOException e) {
            e.printStackTrace();
            return null;
        }
    }
}