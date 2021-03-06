use std::fs::File;
use std::io::BufRead;
use std::iter::FromIterator;

use rayon::prelude::*;
use regex::bytes::{Captures, Regex};

/// A tool to extract the data from the `*.sql` files
pub struct Extractor {
    rg: Regex,
}

impl Extractor {
    // /// Do the actual extraction
    // /// - `sql` is the text to extract from
    // /// - `queue` is where to put the result, this is done so to be more practical for multithreading
    // pub fn extract<T: SqlExtractable>(&self, sql: &str, queue: &mut VecDeque<T>) -> () {
    // 	queue.extend(self.extract_iter(sql))
    // }

    pub fn extract_iter<'a, T: SqlExtractable>(
        &'a self,
        sql: &'a [u8],
    ) -> impl Iterator<Item = T> + 'a {
        self.rg.captures_iter(sql).map(|cap| T::from(cap))
    }

    /// Make a new [`Extractor`]. Make sure to tell what `T` when using this
    pub fn new<T: SqlExtractable>() -> Result<Self, regex::Error> {
        let rg = Regex::new(&format!("(?-u)\\({}\\)", T::PATTERN))?;
        // println!("{:?}", rg.as_str());
        return Ok(Self { rg });
    }

    pub fn extract_par_iter_file<'a, T>(file: File) -> impl ParallelIterator<Item = T> + 'a
    where
        T: SqlExtractable + Send + Sync,
    {
        std::io::BufReader::new(file) // read the file
            .split('\n' as u8) // split to lines serially
            .filter_map(|line: Result<_, _>| line.ok()) // remove broken lines
            .par_bridge() // parallelize
            .flat_map(|sql: Vec<u8>| {
                Vec::from_iter(Extractor::new::<T>().unwrap().extract_iter::<T>(&sql))
                    .into_par_iter()
            }) // do the work
    }
}

/// Something that can be extracted from an `*.sql` file via an [`Extractor`]
pub trait SqlExtractable {
    /// The regexp to match the sql INSERT querry.
    /// # Example
    /// for the categories this used to be
    /// ```rust
    /// r"(?P<id>\d+),'(?P<title>.*?)',\d+,\d+,\d+";
    /// ```
    const PATTERN: &'static str;

    /// Make `self` from the [Captures] object extracted thanks to [PATTERN].
    fn from(cap: Captures) -> Self;
}
